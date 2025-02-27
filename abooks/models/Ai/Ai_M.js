/* eslint-disable no-lonely-if */
/* eslint-disable camelcase */
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
import AiContextFile from '../../schema/Ai/AiContextFile.js';
import fs from 'fs';
import path from 'path';
import { findAndDelete } from '../../helpers/core/file-system.js';

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

      // Get context files
      const contextFiles = await AiContextFile.find({
        book_slug: book_slug,
        chapter_slug: chapter_slug
      });

      // Add context from files if any exist
      let contextContent = "";
      for (const file of contextFiles) {
        try {
          const filePath = path.join(process.cwd(), 'uploads', file.path);
          if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            contextContent += `\n\nContext from file ${file.name}:\n${fileContent}`;
          }
        } catch (err) {
          console.error(`Error reading context file ${file.path}:`, err);
        }
      }

      // Append context content to chapter content if it exists
      if (contextContent) {
        chapterContent += contextContent;
      }

      const imgSources = await extractImagesFromHtml(chapterContent);

      chapterContent = stripHtml(chapterContent).result;

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

  // New methods for handling AI context files
  static async saveContextFiles(files) {
  try {
    console.log('Saving context files to database:', files.length);
    const savedFiles = await AiContextFile.insertMany(files);
    console.log('Files saved successfully:', savedFiles.length);
    return savedFiles;
  } catch (error) {
    console.error('Error saving context files to database:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

  static async getContextFiles(bookSlug, chapterSlug) {
    try {
      return await AiContextFile.find({ book_slug: bookSlug, chapter_slug: chapterSlug })
        .sort({ created_at: -1 });
    } catch (error) {
      console.error('Error retrieving context files:', error);
      throw error;
    }
  }

  static async deleteContextFile(fileId) {
    try {
      const file = await AiContextFile.findById(fileId);
      
      if (!file) {
        return null;
      }
      
      // Delete the file from the filesystem
      const filePath = path.join(process.cwd(), 'uploads', file.path);
      findAndDelete(filePath);
      
      // Delete the record from the database
      await AiContextFile.findByIdAndDelete(fileId);
      
      return true;
    } catch (error) {
      console.error('Error deleting context file:', error);
      throw error;
    }
  }
}

export default AiModel;