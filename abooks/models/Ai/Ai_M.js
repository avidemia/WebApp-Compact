/* eslint-disable no-lonely-if */
/* eslint-disable camelcase */
import fs from 'fs';
import path from 'path';
import { resolve } from 'path';
import OpenAI from 'openai';
import { stripHtml } from 'string-strip-html';
import Response from '../../helpers/Response.js';
import { AI_MODEL } from '../../helpers/constant/constant.js';
import { extractImagesFromHtml } from '../../helpers/util/util.js';
import Chapter from '../../schema/Book/Chapter.js';
import HeaderOne from '../../schema/Book/Header1.js';
import HeaderTwo from '../../schema/Book/Header2.js';
import ChapterClone from '../../schema/BookClone/ChapterClone.js';
import HeaderOneClone from '../../schema/BookClone/Header1Clone.js';
import HeaderTwoClone from '../../schema/BookClone/Header2Clone.js';
import mongoose from 'mongoose';

// Get or define the ChapterContextFile model
let ChapterContextFile;
try {
  ChapterContextFile = mongoose.model('chapter_context_file');
} catch (err) {
  // If the model doesn't exist, don't worry about it
  console.log('ChapterContextFile model not found, AI will function without context files');
}

class AiModel {
  static async question(reqData) {
    let response;

    const {
      book_slug,
      chapter_slug,
      content,
      mathFormat,
      header_slug,
      isHeaderTwo,
    } = reqData;

    if ((!book_slug || !chapter_slug || !content, mathFormat === undefined)) {
      response = new Response(400, 'F').custom(
        'book_slug, chapter_slug, content are required',
      );
      return response;
    }

    const isClone = book_slug.includes('clone');

    try {
      let chapter;
      if (header_slug) {
        if (isClone) {
          if (isHeaderTwo) {
            chapter = await HeaderTwoClone.findOne({
              book_slug_clone: reqData.book_slug,
              slug: reqData.isHeaderTwo,
            }).lean();
          } else {
            chapter = await HeaderOneClone.findOne({
              book_slug_clone: reqData.book_slug,
              slug: reqData.header_slug,
            }).lean();
          }
        } else {
          if (isHeaderTwo) {
            chapter = await HeaderTwo.findOne({
              book_slug: reqData.book_slug,
              slug: reqData.isHeaderTwo,
            }).lean();
          } else {
            chapter = await HeaderOne.findOne({
              book_slug: reqData.book_slug,
              slug: reqData.header_slug,
            }).lean();
          }
        }
      } else {
        if (isClone) {
          chapter = await ChapterClone.findOne({
            book_slug_clone: reqData.book_slug,
            slug: reqData.chapter_slug,
          }).lean();
        } else {
          chapter = await Chapter.findOne({
            book_slug: reqData.book_slug,
            slug: reqData.chapter_slug,
          }).lean();
        }
      }

      if (!chapter) {
        response = new Response(400, 'F').custom('chapter not found');
        return response;
      }

      let chapterContent;
      if (header_slug) {
        if (isClone) {
          chapterContent = chapter.header1_content_clone;
        } else {
          if (isHeaderTwo) {
            chapterContent = chapter.header2_content;
          } else {
            chapterContent = chapter.header1_content;
          }
        }
      } else {
        if (isClone) {
          chapterContent = chapter.chapter_content_clone;
        } else {
          chapterContent = chapter.chapter_content;
        }
      }

      const imgSources = await extractImagesFromHtml(chapterContent);
      chapterContent = stripHtml(chapterContent).result;

      // Get context files for this chapter if the model exists
      let contextFilesContent = '';
      try {
        if (ChapterContextFile) {
          // Try to retrieve context files from the database
          const contextFiles = await ChapterContextFile.find({
            book_slug: reqData.book_slug,
            chapter_slug: reqData.chapter_slug
          });

          // Read the content of each context file
          for (const file of contextFiles) {
            try {
              if (file.path) {
                const filePath = path.join(resolve(), 'uploads', file.path);
                if (fs.existsSync(filePath)) {
                  const fileContent = fs.readFileSync(filePath, 'utf8');
                  contextFilesContent += `\n\n--- Context from ${file.name} ---\n${fileContent}\n`;
                }
              }
            } catch (fileErr) {
              console.error(`Error reading context file: ${fileErr.message}`);
            }
          }
        } else {
          // If model doesn't exist, try to scan directory for files
          const dirPath = path.join(resolve(), 'uploads/ai-context', reqData.book_slug, reqData.chapter_slug);
          if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
              try {
                const filePath = path.join(dirPath, file);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                contextFilesContent += `\n\n--- Context from ${file} ---\n${fileContent}\n`;
              } catch (fileErr) {
                console.error(`Error reading context file: ${fileErr.message}`);
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error retrieving context files: ${err.message}`);
      }

      // Add context files to chapter content if any exist
      if (contextFilesContent) {
        chapterContent += "\n\n--- ADDITIONAL CONTEXT (NOT VISIBLE TO USERS) ---" + contextFilesContent;
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const chatHistory = content;

      if (!Array.isArray(chatHistory)) {
        response = new Response(400, 'F').custom('chatHistory must be array');
        return response;
      }

      const chatData = chatHistory.map((item) => ({
        role: item.type === 'sent' ? 'user' : 'assistant',
        content: item.text,
      }));

      const messages = [
        {
          role: 'assistant',
          content: chapterContent,
        },
        ...chatData,
      ];

      if (mathFormat) {
        messages.push({
          role: 'system',
          content: 'send answer with mathjax format',
        });
        messages.push({
          role: 'system',
          content:
            'LaTex math mode specific delimiters as following : 1- inline math mode : `\\(` and `\\)` 2- display math mode : `\\[` and `\\]` 3- try use display math mode as much as possible',
        });
        messages.push({
          role: 'system',
          content: 'use html format to answer do not use markdowns',
        });
      } else {
        messages.push({
          role: 'system',
          content: 'send answer with markdown format',
        });
      }

      if (imgSources.length > 0) {
        imgSources.forEach((img) => {
          if (img.caption) {
            messages.push({
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: img.src } },
                { type: 'text', text: img.caption },
              ],
            });
          } else {
            messages.push({
              role: 'user',
              content: [{ type: 'image_url', image_url: { url: img.src } }],
            });
          }
        });
      }

      const chatCompletion = await openai.chat.completions.create({
        messages,
        model: AI_MODEL,
        n: 1,
      });

      const aiAnswer = chatCompletion.choices[0].message.content;

      const splitLine = aiAnswer.split('\n');
      const cleanLine = splitLine.join('<br/>');

      chatCompletion.choices[0].message.content = cleanLine;

      response = new Response(200, 'T', {
        message: chatCompletion.choices[0].message,
        mathFormat,
      });
    } catch (error) {
      console.log(error);
      response = new Response(500, 'F').custom(error.message);
    }
    return response;
  }

  static async questionWithData(reqData) {
    let response;

    const { initialData, content, mathFormat } = reqData;

    const chatHistory = content;

    if (!Array.isArray(chatHistory)) {
      response = new Response(400, 'F').custom('chatHistory must be array');
      return response;
    }

    const chatData = chatHistory.map((item) => ({
      role: item.type === 'sent' ? 'user' : 'assistant',
      content: item.text,
    }));

    try {
      const cleanInitData = stripHtml(initialData).result;

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const messages = [
        {
          role: 'assistant',
          content: cleanInitData,
        },
        ...chatData,
      ];

      if (mathFormat) {
        messages.push({
          role: 'system',
          content: 'send answer with mathjax format',
        });
        messages.push({
          role: 'system',
          content:
            'LaTex math mode specific delimiters as following : 1- inline math mode : `\\(` and `\\)` 2- display math mode : `\\[` and `\\]` 3- try use display math mode as much as possible',
        });
        messages.push({
          role: 'system',
          content: 'use html format to answer do not use markdowns',
        });
      } else {
        messages.push({
          role: 'system',
          content: 'send answer with markdown format',
        });
      }

      const chatCompletion = await openai.chat.completions.create({
        messages,
        model: 'gpt-3.5-turbo-16k',
        n: 1,
      });

      response = new Response(200, 'T', {
        message: chatCompletion.choices[0].message,
        mathFormat,
      });
    } catch (error) {
      console.log(error);
      response = new Response(500, 'F').custom(error.message);
    }
    return response;
  }
}

export default AiModel;