/* eslint-disable prefer-destructuring */
/* eslint-disable no-lonely-if */
import { resolve, join, extname } from 'path';
import mongoose from 'mongoose';
import decompress from 'decompress';
import Book from '../schema/Book/Book.js';
import Chapter from '../schema/Book/Chapter.js';
import HeaderOne from '../schema/Book/Header1.js';
import HeaderTwo from '../schema/Book/Header2.js';
import HeaderThree from '../schema/Book/Header3.js';
import Response from '../helpers/Response.js';
import {
  removeSpaceAndReplace,
  titleCase,
} from '../helpers/third-party/custom.js';
import ReadHelpers from '../helpers/project/modules/core/Read.js';
import {
  findAndDelete,
  checkAndCreateDir,
  moveFile,
  findAndDeleteDirectory,
} from '../helpers/core/file-system.js';
import BookImage from '../schema/Book/BookImage.js';

const { Types } = mongoose;

async function findChapters(value) {
  try {
    const data = await Chapter.findOne({
      $and: [{ book_id: value.book_id }, { chapter_name: value.chapter_name }],
    });

    return data;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function findHeaderOne(value) {
  try {
    const data = await HeaderOne.findOne({
      $and: [
        { book_id: value.book_id },
        { chapter_id: value.chapter_id },
        { header1_name: value.header1_name },
      ],
    });

    return data;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function findHeaderTwo(value) {
  try {
    const data = await HeaderTwo.findOne({
      $and: [
        { book_id: value.book_id },
        { header1_id: value.header1_id },
        { header2_name: value.header2_name },
      ],
    });

    return data;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function findHeaderThree(value) {
  try {
    const data = await HeaderThree.findOne({
      $and: [
        { book_id: value.book_id },
        { header2_id: value.header2_id },
        { header3_name: value.header3_name },
      ],
    });

    return data;
  } catch (error) {
    throw new Error(error.message);
  }
}

export default class ChapterModel {
  /* ------------------------------- Upload Zip ------------------------------- */

  static async uploadZipFile(reqData) {
    let response;
    try {
      let zipPath = '';

      if (reqData?.file) {
        zipPath = join(
          resolve(),
          reqData?.file?.destination,
          reqData?.file?.filename,
        );
      } else {
        zipPath = '';
      }

      const bookName = titleCase(reqData.file.originalname.split('.')[0], '-');

      const findBook = await Book.findOne({ book_name: bookName });

      if (!findBook) {
        let newBookData;

        if (reqData?.book_id) {
          newBookData = { _id: reqData?.book_id };
        } else {
          newBookData = await Book.create({
            category_id: reqData.category_id,
            book_name: bookName,
          });
        }

        const outPath = join(resolve(), 'uploads/unzipped-books');

        const files = await decompress(zipPath, outPath, {
          filter: (file) => extname(file.path) !== '.exe',
        });

        for await (const file of files) {
          if (extname(file.path) === '.html') {
            const breakChapters = file.path.split('/');
            const removeBook = breakChapters.slice(1, breakChapters.length);

            let trimHtmlFromFile;

            // Chapters
            if (removeBook.length === 1) {
              trimHtmlFromFile = removeBook[0].split('.');

              const chapterName = titleCase(trimHtmlFromFile[1], '-');

              const isChapterInDb = await findChapters({
                book_id: newBookData._id,
                chapter_name: chapterName,
              });

              if (!isChapterInDb) {
                const sequence = await ReadHelpers.findLastSequence(Chapter, {
                  book_id: newBookData._id,
                });

                if (trimHtmlFromFile[0] === 'express') {
                  await Chapter.create({
                    book_id: newBookData._id,
                    chapter_name: chapterName,
                    chapter_express_content: file.data.toString(),
                    sequence,
                  });
                } else {
                  await Chapter.create({
                    book_id: newBookData._id,
                    chapter_name: chapterName,
                    chapter_content: file.data.toString(),
                    sequence,
                  });
                }
              } else {
                if (trimHtmlFromFile[0] === 'express') {
                  await Chapter.findByIdAndUpdate(isChapterInDb._id, {
                    chapter_express_content: file.data.toString(),
                  });
                } else {
                  await Chapter.findByIdAndUpdate(isChapterInDb._id, {
                    chapter_content: file.data.toString(),
                  });
                }
              }
            }

            // Chapters + Headers 1
            if (removeBook.length === 2) {
              trimHtmlFromFile = removeBook[1].split('.');

              const chapterName = titleCase(removeBook[0], '-');
              const header1Name = titleCase(trimHtmlFromFile[1], '-');

              const isChapterInDb = await findChapters({
                book_id: newBookData._id,
                chapter_name: chapterName,
              });

              let chapterForHeaderOne = isChapterInDb;

              if (!isChapterInDb) {
                const sequence = await ReadHelpers.findLastSequence(Chapter, {
                  book_id: newBookData._id,
                });

                chapterForHeaderOne = await Chapter.create({
                  book_id: newBookData._id,
                  chapter_name: chapterName,
                  sequence,
                });
              }

              const isHeaderOneInDb = await findHeaderOne({
                book_id: newBookData._id,
                chapter_id: chapterForHeaderOne._id,
                header1_name: header1Name,
              });

              if (!isHeaderOneInDb) {
                const headerOneSequence = await ReadHelpers.findLastSequence(
                  HeaderOne,
                  {
                    chapter_id: chapterForHeaderOne._id,
                  },
                );

                if (trimHtmlFromFile[0] === 'express') {
                  await HeaderOne.create({
                    book_id: newBookData._id,
                    chapter_id: chapterForHeaderOne._id,
                    header1_name: header1Name,
                    header1_express_content: file.data.toString(),
                    sequence: headerOneSequence,
                  });
                } else {
                  await HeaderOne.create({
                    book_id: newBookData._id,
                    chapter_id: chapterForHeaderOne._id,
                    header1_name: header1Name,
                    header1_content: file.data.toString(),
                    sequence: headerOneSequence,
                  });
                }
              } else {
                if (trimHtmlFromFile[0] === 'express') {
                  await HeaderOne.findByIdAndUpdate(isHeaderOneInDb._id, {
                    header1_express_content: file.data.toString(),
                  });
                } else {
                  await HeaderOne.findByIdAndUpdate(isHeaderOneInDb._id, {
                    header1_content: file.data.toString(),
                  });
                }
              }
            }

            // Chapters + Headers 1 + Headers 2
            if (removeBook.length === 3) {
              const chapterName = titleCase(removeBook[0], '-');
              const headerOneName = titleCase(removeBook[1], '-');

              const isChapterInDb = await findChapters({
                book_id: newBookData._id,
                chapter_name: chapterName,
              });

              let chapterForHeaderOne = isChapterInDb;

              if (!isChapterInDb) {
                const sequence = await ReadHelpers.findLastSequence(Chapter, {
                  book_id: newBookData._id,
                });

                chapterForHeaderOne = await Chapter.create({
                  book_id: newBookData._id,
                  chapter_name: chapterName,
                  sequence,
                });
              }

              const isHeaderOneInDb = await findHeaderOne({
                book_id: newBookData._id,
                chapter_id: chapterForHeaderOne._id,
                header1_name: headerOneName,
              });

              let headerOneForHeaderHeaderTwo = isHeaderOneInDb;

              if (!isHeaderOneInDb) {
                const headerOneSequence = await ReadHelpers.findLastSequence(
                  HeaderOne,
                  {
                    chapter_id: chapterForHeaderOne._id,
                  },
                );

                headerOneForHeaderHeaderTwo = await HeaderOne.create({
                  book_id: newBookData._id,
                  chapter_id: chapterForHeaderOne._id,
                  header1_name: headerOneName,
                  sequence: headerOneSequence,
                });
              }

              // Header 2
              // removeBook- [ 'ch1', 'ch1-hl1-header-1', 'express.ch1-hl1-hl2-header-1.html' ]

              trimHtmlFromFile = removeBook[2].split('.');
              const header2Name = titleCase(trimHtmlFromFile[1], '-');

              const isHeaderTwoInDb = await findHeaderTwo({
                book_id: newBookData._id,
                header1_id: headerOneForHeaderHeaderTwo._id,
                header2_name: header2Name,
              });

              if (!isHeaderTwoInDb) {
                const headerTwoSequence = await ReadHelpers.findLastSequence(
                  HeaderTwo,
                  {
                    header1_id: headerOneForHeaderHeaderTwo._id,
                  },
                );

                if (trimHtmlFromFile[0] === 'express') {
                  await HeaderTwo.create({
                    book_id: newBookData._id,
                    header1_id: headerOneForHeaderHeaderTwo._id,
                    header2_name: header2Name,
                    header2_express_content: file.data.toString(),
                    sequence: headerTwoSequence,
                  });
                } else {
                  await HeaderTwo.create({
                    book_id: newBookData._id,
                    header1_id: headerOneForHeaderHeaderTwo._id,
                    header2_name: header2Name,
                    header2_content: file.data.toString(),
                    sequence: headerTwoSequence,
                  });
                }
              } else {
                if (trimHtmlFromFile[0] === 'express') {
                  await HeaderTwo.findByIdAndUpdate(isHeaderTwoInDb._id, {
                    header2_express_content: file.data.toString(),
                  });
                } else {
                  await HeaderTwo.findByIdAndUpdate(isHeaderTwoInDb._id, {
                    header2_content: file.data.toString(),
                  });
                }
              }
            }

            // Chapters + Headers 1 + Headers 2 + Headers 3
            if (removeBook.length === 4) {
              const chapterName = titleCase(removeBook[0], '-');
              const headerOneName = titleCase(removeBook[1], '-');
              const headerTwoName = titleCase(removeBook[2], '-');

              const isChapterInDb = await findChapters({
                book_id: newBookData._id,
                chapter_name: chapterName,
              });

              let chapterForHeaderOne = isChapterInDb;

              if (!isChapterInDb) {
                const sequence = await ReadHelpers.findLastSequence(Chapter, {
                  book_id: newBookData._id,
                });

                chapterForHeaderOne = await Chapter.create({
                  book_id: newBookData._id,
                  chapter_name: chapterName,
                  sequence,
                });
              }

              const isHeaderOneInDb = await findHeaderOne({
                book_id: newBookData._id,
                chapter_id: chapterForHeaderOne._id,
                header1_name: headerOneName,
              });

              let headerOneForHeaderHeaderTwo = isHeaderOneInDb;

              if (!isHeaderOneInDb) {
                const headerOneSequence = await ReadHelpers.findLastSequence(
                  HeaderOne,
                  {
                    chapter_id: chapterForHeaderOne._id,
                  },
                );

                headerOneForHeaderHeaderTwo = await HeaderOne.create({
                  book_id: newBookData._id,
                  chapter_id: chapterForHeaderOne._id,
                  header1_name: headerOneName,
                  sequence: headerOneSequence,
                });
              }

              const isHeaderTwoInDb = await findHeaderTwo({
                book_id: newBookData._id,
                header1_id: headerOneForHeaderHeaderTwo._id,
                header2_name: headerTwoName,
              });

              let headerTwoForHeaderHeaderThree = isHeaderTwoInDb;

              if (!isHeaderTwoInDb) {
                const headerTwoSequence = await ReadHelpers.findLastSequence(
                  HeaderTwo,
                  {
                    header1_id: headerOneForHeaderHeaderTwo._id,
                  },
                );

                headerTwoForHeaderHeaderThree = await HeaderTwo.create({
                  book_id: newBookData._id,
                  header1_id: headerOneForHeaderHeaderTwo._id,
                  header2_name: headerTwoName,
                  sequence: headerTwoSequence,
                });
              }

              trimHtmlFromFile = removeBook[3].split('.');
              const header3Name = titleCase(trimHtmlFromFile[1], '-');

              const isHeaderThreeInDb = await findHeaderThree({
                book_id: newBookData._id,
                header2_id: headerTwoForHeaderHeaderThree._id,
                header3_name: header3Name,
              });

              if (!isHeaderThreeInDb) {
                const headerThreeSequence = await ReadHelpers.findLastSequence(
                  HeaderThree,
                  {
                    header2_id: headerTwoForHeaderHeaderThree._id,
                  },
                );

                if (trimHtmlFromFile[0] === 'express') {
                  await HeaderThree.create({
                    book_id: newBookData._id,
                    header2_id: headerTwoForHeaderHeaderThree._id,
                    header3_name: header3Name,
                    header3_express_content: file.data.toString(),
                    sequence: headerThreeSequence,
                  });
                } else {
                  await HeaderThree.create({
                    book_id: newBookData._id,
                    header2_id: headerTwoForHeaderHeaderThree._id,
                    header3_name: header3Name,
                    header3_content: file.data.toString(),
                    sequence: headerThreeSequence,
                  });
                }
              } else {
                if (trimHtmlFromFile[0] === 'express') {
                  await HeaderThree.findByIdAndUpdate(isHeaderThreeInDb._id, {
                    header3_express_content: file.data.toString(),
                  });
                } else {
                  await HeaderThree.findByIdAndUpdate(isHeaderThreeInDb._id, {
                    header3_content: file.data.toString(),
                  });
                }
              }
            }
          }
        }

        response = new Response(201, 'T').common('CREATE', 'Book');
      } else {
        const delZipPath = join(
          reqData.file.destination,
          reqData.file.filename,
        );

        findAndDelete(delZipPath);
        response = new Response(409, 'F').custom('Duplicate book found.');
      }
    } catch (error) {
      response = new Response().custom(error.message);
    }
    return response;
  }

  static async uploadZipFileImage(reqData) {
    let response;
    try {
      let zipPath = '';

      if (reqData?.file) {
        zipPath = join(
          resolve(),
          reqData?.file?.destination,
          reqData?.file?.filename,
        );
      } else {
        zipPath = '';
      }

      const bookName = titleCase(reqData.file.originalname.split('.')[0], '-');

      const findBook = await Book.findOne({ book_name: bookName }).lean();

      if (!findBook) {
        let newBookData;

        if (reqData?.book_id) {
          const findBookById = await Book.findOne({
            _id: reqData.book_id,
          }).lean();
          newBookData = {
            _id: findBookById._id,
            book_name: findBookById.book_name,
          };
        } else {
          newBookData = await Book.create({
            category_id: reqData.category_id,
            book_name: bookName,
          });
        }

        const outPath = join(resolve(), 'uploads/unzipped-books');

        const files = await decompress(zipPath, outPath, {
          filter: (file) => extname(file.path) !== '.exe',
        });

        for await (const file of files) {
          if (extname(file.path) === '.html') {
            const breakChapters = file.path.split('/');
            const removeBook = breakChapters.slice(1, breakChapters.length);

            let trimHtmlFromFile;

            // Chapters
            if (removeBook.length === 1) {
              trimHtmlFromFile = removeBook[0].split('.');

              const chapterName = titleCase(trimHtmlFromFile[1], '-');

              const isChapterInDb = await findChapters({
                book_id: newBookData._id,
                chapter_name: chapterName,
              });

              if (!isChapterInDb) {
                const sequence = await ReadHelpers.findLastSequence(Chapter, {
                  book_id: newBookData._id,
                });

                if (trimHtmlFromFile[0] === 'express') {
                  await Chapter.create({
                    book_id: newBookData._id,
                    chapter_name: chapterName,
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    slug: trimHtmlFromFile[1],
                    chapter_express_content: file.data.toString(),
                    sequence,
                  });
                } else {
                  await Chapter.create({
                    book_id: newBookData._id,
                    chapter_name: chapterName,
                    slug: trimHtmlFromFile[1],
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    chapter_content: file.data.toString(),
                    sequence,
                  });
                }
              } else {
                if (trimHtmlFromFile[0] === 'express') {
                  await Chapter.findByIdAndUpdate(isChapterInDb._id, {
                    chapter_express_content: file.data.toString(),
                    slug: trimHtmlFromFile[1],
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                  });
                } else {
                  await Chapter.findByIdAndUpdate(isChapterInDb._id, {
                    chapter_content: file.data.toString(),
                    slug: trimHtmlFromFile[1],
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                  });
                }
              }
            }

            // Chapters + Headers 1
            if (removeBook.length === 2) {
              trimHtmlFromFile = removeBook[1].split('.');

              const chapterName = titleCase(removeBook[0], '-');
              const header1Name = titleCase(trimHtmlFromFile[1], '-');

              const isChapterInDb = await findChapters({
                book_id: newBookData._id,
                chapter_name: chapterName,
              });

              let chapterForHeaderOne = isChapterInDb;

              if (!isChapterInDb) {
                const sequence = await ReadHelpers.findLastSequence(Chapter, {
                  book_id: newBookData._id,
                });

                chapterForHeaderOne = await Chapter.create({
                  book_id: newBookData._id,
                  chapter_name: chapterName,
                  book_slug: removeSpaceAndReplace(newBookData.book_name, '-'),
                  slug: removeBook[0],
                  sequence,
                });
              }

              const isHeaderOneInDb = await findHeaderOne({
                book_id: newBookData._id,
                chapter_id: chapterForHeaderOne._id,
                header1_name: header1Name,
              });

              if (!isHeaderOneInDb) {
                const headerOneSequence = await ReadHelpers.findLastSequence(
                  HeaderOne,
                  {
                    chapter_id: chapterForHeaderOne._id,
                  },
                );

                if (trimHtmlFromFile[0] === 'express') {
                  await HeaderOne.create({
                    book_id: newBookData._id,
                    chapter_id: chapterForHeaderOne._id,
                    header1_name: header1Name,
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    chapter_slug: removeBook[0],
                    slug: trimHtmlFromFile[1],
                    header1_express_content: file.data.toString(),
                    sequence: headerOneSequence,
                  });
                } else {
                  await HeaderOne.create({
                    book_id: newBookData._id,
                    chapter_id: chapterForHeaderOne._id,
                    header1_name: header1Name,
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    chapter_slug: removeBook[0],
                    slug: trimHtmlFromFile[1],
                    header1_content: file.data.toString(),
                    sequence: headerOneSequence,
                  });
                }
              } else {
                if (trimHtmlFromFile[0] === 'express') {
                  await HeaderOne.findByIdAndUpdate(isHeaderOneInDb._id, {
                    header1_express_content: file.data.toString(),
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    chapter_slug: removeBook[0],
                    slug: trimHtmlFromFile[1],
                  });
                } else {
                  await HeaderOne.findByIdAndUpdate(isHeaderOneInDb._id, {
                    header1_content: file.data.toString(),
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    chapter_slug: removeBook[0],
                    slug: trimHtmlFromFile[1],
                  });
                }
              }
            }

            // Chapters + Headers 1 + Headers 2
            if (removeBook.length === 3) {
              const chapterName = titleCase(removeBook[0], '-');
              const headerOneName = titleCase(removeBook[1], '-');

              const isChapterInDb = await findChapters({
                book_id: newBookData._id,
                chapter_name: chapterName,
              });

              let chapterForHeaderOne = isChapterInDb;

              if (!isChapterInDb) {
                const sequence = await ReadHelpers.findLastSequence(Chapter, {
                  book_id: newBookData._id,
                });

                chapterForHeaderOne = await Chapter.create({
                  book_id: newBookData._id,
                  chapter_name: chapterName,
                  book_slug: removeSpaceAndReplace(newBookData.book_name, '-'),
                  slug: removeBook[0],
                  sequence,
                });
              }

              const isHeaderOneInDb = await findHeaderOne({
                book_id: newBookData._id,
                chapter_id: chapterForHeaderOne._id,
                header1_name: headerOneName,
              });

              let headerOneForHeaderHeaderTwo = isHeaderOneInDb;

              if (!isHeaderOneInDb) {
                const headerOneSequence = await ReadHelpers.findLastSequence(
                  HeaderOne,
                  {
                    chapter_id: chapterForHeaderOne._id,
                  },
                );

                headerOneForHeaderHeaderTwo = await HeaderOne.create({
                  book_id: newBookData._id,
                  chapter_id: chapterForHeaderOne._id,
                  book_slug: removeSpaceAndReplace(newBookData.book_name, '-'),
                  chapter_slug: removeBook[0],
                  slug: removeBook[1],
                  header1_name: headerOneName,
                  sequence: headerOneSequence,
                });
              }

              // Header 2
              // removeBook- [ 'ch1', 'ch1-hl1-header-1', 'express.ch1-hl1-hl2-header-1.html' ]

              trimHtmlFromFile = removeBook[2].split('.');
              const header2Name = titleCase(trimHtmlFromFile[1], '-');

              const isHeaderTwoInDb = await findHeaderTwo({
                book_id: newBookData._id,
                header1_id: headerOneForHeaderHeaderTwo._id,
                header2_name: header2Name,
              });

              if (!isHeaderTwoInDb) {
                const headerTwoSequence = await ReadHelpers.findLastSequence(
                  HeaderTwo,
                  {
                    header1_id: headerOneForHeaderHeaderTwo._id,
                  },
                );

                if (trimHtmlFromFile[0] === 'express') {
                  await HeaderTwo.create({
                    book_id: newBookData._id,
                    header1_id: headerOneForHeaderHeaderTwo._id,
                    header2_name: header2Name,
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    chapter_slug: removeBook[0],
                    header1_slug: removeBook[1],
                    slug: trimHtmlFromFile[1],
                    header2_express_content: file.data.toString(),
                    sequence: headerTwoSequence,
                  });
                } else {
                  await HeaderTwo.create({
                    book_id: newBookData._id,
                    header1_id: headerOneForHeaderHeaderTwo._id,
                    header2_name: header2Name,
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    chapter_slug: removeBook[0],
                    header1_slug: removeBook[1],
                    slug: trimHtmlFromFile[1],
                    header2_content: file.data.toString(),
                    sequence: headerTwoSequence,
                  });
                }
              } else {
                if (trimHtmlFromFile[0] === 'express') {
                  await HeaderTwo.findByIdAndUpdate(isHeaderTwoInDb._id, {
                    header2_express_content: file.data.toString(),
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    chapter_slug: removeBook[0],
                    header1_slug: removeBook[1],
                    slug: trimHtmlFromFile[1],
                  });
                } else {
                  await HeaderTwo.findByIdAndUpdate(isHeaderTwoInDb._id, {
                    header2_content: file.data.toString(),
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    chapter_slug: removeBook[0],
                    header1_slug: removeBook[1],
                    slug: trimHtmlFromFile[1],
                  });
                }
              }
            }

            // Chapters + Headers 1 + Headers 2 + Headers 3
            if (removeBook.length === 4) {
              const chapterName = titleCase(removeBook[0], '-');
              const headerOneName = titleCase(removeBook[1], '-');
              const headerTwoName = titleCase(removeBook[2], '-');

              const isChapterInDb = await findChapters({
                book_id: newBookData._id,
                chapter_name: chapterName,
              });

              let chapterForHeaderOne = isChapterInDb;

              if (!isChapterInDb) {
                const sequence = await ReadHelpers.findLastSequence(Chapter, {
                  book_id: newBookData._id,
                });

                chapterForHeaderOne = await Chapter.create({
                  book_id: newBookData._id,
                  chapter_name: chapterName,
                  book_slug: removeSpaceAndReplace(newBookData.book_name, '-'),
                  slug: removeBook[0],
                  sequence,
                });
              }

              const isHeaderOneInDb = await findHeaderOne({
                book_id: newBookData._id,
                chapter_id: chapterForHeaderOne._id,
                header1_name: headerOneName,
              });

              let headerOneForHeaderHeaderTwo = isHeaderOneInDb;

              if (!isHeaderOneInDb) {
                const headerOneSequence = await ReadHelpers.findLastSequence(
                  HeaderOne,
                  {
                    chapter_id: chapterForHeaderOne._id,
                  },
                );

                headerOneForHeaderHeaderTwo = await HeaderOne.create({
                  book_id: newBookData._id,
                  chapter_id: chapterForHeaderOne._id,
                  header1_name: headerOneName,
                  book_slug: removeSpaceAndReplace(newBookData.book_name, '-'),
                  chapter_slug: removeBook[0],
                  slug: removeBook[1],
                  sequence: headerOneSequence,
                });
              }

              const isHeaderTwoInDb = await findHeaderTwo({
                book_id: newBookData._id,
                header1_id: headerOneForHeaderHeaderTwo._id,
                header2_name: headerTwoName,
              });

              let headerTwoForHeaderHeaderThree = isHeaderTwoInDb;

              if (!isHeaderTwoInDb) {
                const headerTwoSequence = await ReadHelpers.findLastSequence(
                  HeaderTwo,
                  {
                    header1_id: headerOneForHeaderHeaderTwo._id,
                  },
                );

                headerTwoForHeaderHeaderThree = await HeaderTwo.create({
                  book_id: newBookData._id,
                  header1_id: headerOneForHeaderHeaderTwo._id,
                  header2_name: headerTwoName,
                  book_slug: removeSpaceAndReplace(newBookData.book_name, '-'),
                  chapter_slug: removeBook[0],
                  header1_slug: removeBook[1],
                  slug: removeBook[2],
                  sequence: headerTwoSequence,
                });
              }

              trimHtmlFromFile = removeBook[3].split('.');
              const header3Name = titleCase(trimHtmlFromFile[1], '-');

              const isHeaderThreeInDb = await findHeaderThree({
                book_id: newBookData._id,
                header2_id: headerTwoForHeaderHeaderThree._id,
                header3_name: header3Name,
              });

              if (!isHeaderThreeInDb) {
                const headerThreeSequence = await ReadHelpers.findLastSequence(
                  HeaderThree,
                  {
                    header2_id: headerTwoForHeaderHeaderThree._id,
                  },
                );

                if (trimHtmlFromFile[0] === 'express') {
                  await HeaderThree.create({
                    book_id: newBookData._id,
                    header2_id: headerTwoForHeaderHeaderThree._id,
                    header3_name: header3Name,
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    chapter_slug: removeBook[0],
                    header1_slug: removeBook[1],
                    header2_slug: removeBook[2],
                    slug: trimHtmlFromFile[1],
                    header3_express_content: file.data.toString(),
                    sequence: headerThreeSequence,
                  });
                } else {
                  await HeaderThree.create({
                    book_id: newBookData._id,
                    header2_id: headerTwoForHeaderHeaderThree._id,
                    header3_name: header3Name,
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    chapter_slug: removeBook[0],
                    header1_slug: removeBook[1],
                    header2_slug: removeBook[2],
                    slug: trimHtmlFromFile[1],
                    header3_content: file.data.toString(),
                    sequence: headerThreeSequence,
                  });
                }
              } else {
                if (trimHtmlFromFile[0] === 'express') {
                  await HeaderThree.findByIdAndUpdate(isHeaderThreeInDb._id, {
                    header3_express_content: file.data.toString(),
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    chapter_slug: removeBook[0],
                    header1_slug: removeBook[1],
                    header2_slug: removeBook[2],
                    slug: trimHtmlFromFile[1],
                  });
                } else {
                  await HeaderThree.findByIdAndUpdate(isHeaderThreeInDb._id, {
                    header3_content: file.data.toString(),
                    book_slug: removeSpaceAndReplace(
                      newBookData.book_name,
                      '-',
                    ),
                    chapter_slug: removeBook[0],
                    header1_slug: removeBook[1],
                    header2_slug: removeBook[2],
                    slug: trimHtmlFromFile[1],
                  });
                }
              }
            }
          }

          if (
            extname(file.path) === '.gif' ||
            extname(file.path) === '.jpg' ||
            extname(file.path) === '.jpeg' ||
            extname(file.path) === '.png' ||
            extname(file.path) === '.svg'
          ) {
            const breakChapters = file.path.split('/');
            const removeBook = breakChapters.slice(1, breakChapters.length);

            const nestedDirectories = [];

            for (let i = 0; i < removeBook.length; i += 1) {
              const dirPaths = [resolve(), 'uploads', 'book-images'];

              for (let j = 0; j <= i; j += 1) {
                dirPaths.push(breakChapters[j]);
              }
              nestedDirectories.push(join(...dirPaths));
            }

            checkAndCreateDir(nestedDirectories);

            const oldImagePath = join(
              resolve(),
              'uploads',
              'unzipped-books',
              file.path,
            );

            const newImagePath = join(
              resolve(),
              'uploads',
              'book-images',
              file.path,
            );

            moveFile(oldImagePath, newImagePath);

            const imageObj = {
              book_id: newBookData._id,
              image_path: ['book-images', ...breakChapters],
            };

            if (removeBook.length === 2) {
              imageObj.holder_type = 'CHAPTER';
              imageObj.holder_name = titleCase(removeBook[0], '-');
              imageObj.image_name = removeBook[1];
            }

            if (removeBook.length === 3) {
              imageObj.holder_type = 'HEADER1';
              imageObj.holder_name = titleCase(removeBook[1], '-');
              imageObj.image_name = removeBook[2];
            }

            if (removeBook.length === 4) {
              imageObj.holder_type = 'HEADER2';
              imageObj.holder_name = titleCase(removeBook[2], '-');
              imageObj.image_name = removeBook[3];
            }

            if (removeBook.length === 5) {
              imageObj.holder_type = 'HEADER3';
              imageObj.holder_name = titleCase(removeBook[3], '-');
              imageObj.image_name = removeBook[4];
            }

            await BookImage.create(imageObj);
          }
        }

        findAndDeleteDirectory(
          join(
            'uploads',
            'unzipped-books',
            reqData.file.originalname.split('.')[0],
          ),
        );

        // await Book.deleteOne({ _id: newBookData._id });

        response = new Response(201, 'T').common('CREATE', 'Book');
      } else {
        const delZipPath = join(
          reqData.file.destination,
          reqData.file.filename,
        );

        findAndDelete(delZipPath);
        response = new Response(409, 'F').custom('Duplicate book found.');
      }
    } catch (error) {
      console.log(error);
      response = new Response().custom(error.message);
    }
    return response;
  }

  static async editContent(model, bookId, imageData) {
    try {
      const models = {
        CHAPTER: Chapter,
        HEADER1: HeaderOne,
        HEADER2: HeaderTwo,
        HEADER3: HeaderThree,
      };

      const findContent = await models[model].findOne({
        $and: [
          {
            book_id: bookId,
            [`${model.toLowerCase()}_name`]: imageData.holder_name,
          },
        ],
      });

      const regularContent = findContent[`${model.toLowerCase()}_content`];

      const expressContent =
        findContent[`${model.toLowerCase()}_express_content`];

      const localServerUrl = 'http://192.168.1.134:8002';
      const liveServerUrl = 'http://adaptivebooks.org';

      const serverPath = `${liveServerUrl}/${imageData.image_path.join('/')}`;

      const imageTagPath = `./${
        imageData.image_path[imageData.image_path.length - 2]
      }/${imageData.image_path[imageData.image_path.length - 1]}`;

      const updatedRegularContent = regularContent.replace(
        imageTagPath,
        serverPath,
      );

      const updatedExpressContent = expressContent.replace(
        imageTagPath,
        serverPath,
      );

      if (imageData.holder_type === 'CHAPTER') {
        await Chapter.findByIdAndUpdate(findContent._id, {
          chapter_content: updatedRegularContent,
          chapter_express_content: updatedExpressContent,
        });
      }

      if (imageData.holder_type === 'HEADER1') {
        await HeaderOne.findByIdAndUpdate(findContent._id, {
          header1_content: updatedRegularContent,
          header1_express_content: updatedExpressContent,
        });
      }

      if (imageData.holder_type === 'HEADER2') {
        await HeaderTwo.findByIdAndUpdate(findContent._id, {
          header2_content: updatedRegularContent,
          header2_express_content: updatedExpressContent,
        });
      }

      if (imageData.holder_type === 'HEADER3') {
        await HeaderThree.findByIdAndUpdate(findContent._id, {
          header3_content: updatedRegularContent,
          header3_express_content: updatedExpressContent,
        });
      }
    } catch (error) {
      return false;
    }
  }

  static async syncImages(reqData) {
    let response;
    try {
      const findImages = await BookImage.find({
        book_id: reqData.book_id,
      }).lean();

      if (findImages.length > 0) {
        for await (const image of findImages) {
          if (image.holder_type === 'CHAPTER') {
            await this.editContent('CHAPTER', reqData.book_id, image);
          }
          if (image.holder_type === 'HEADER1') {
            await this.editContent('HEADER1', reqData.book_id, image);
          }
          if (image.holder_type === 'HEADER2') {
            await this.editContent('HEADER2', reqData.book_id, image);
          }
          if (image.holder_type === 'HEADER3') {
            await this.editContent('HEADER3', reqData.book_id, image);
          }
        }

        response = new Response(200, 'T', findImages).custom(
          'Images synchronized successfully.',
        );
      } else {
        response = new Response(404, 'F').custom('Images not found.');
      }
    } catch (error) {
      response = new Response().custom(error.message);
    }
    return response;
  }

  static async uploadImages(reqData) {
    console.log(reqData.file);
    const response = new Response(201, 'T').custom({
      url: reqData.file.path.replace('uploads/', ''),
    });

    return response;
  }

  /* --------------------------------- Others --------------------------------- */

  static async addData(model, requestObject) {
    let returnData;
    try {
      const createChapter = await model.create(requestObject);

      returnData = createChapter;
    } catch (error) {
      returnData = false;
    }
    return returnData;
  }

  static async findLastSequence(model, idObject) {
    let sequence;
    try {
      const countSequence = await model.find(idObject).sort({ sequence: -1 });

      if (countSequence.length > 0) {
        sequence = countSequence[0].sequence + 1;
      } else {
        sequence = 1;
      }
    } catch (error) {
      sequence = false;
    }
    return sequence;
  }

  static async swapSequences(model, from, to) {
    let response;
    try {
      await model.findByIdAndUpdate(from._id, {
        sequence: +to.sequence,
      });

      await model.findByIdAndUpdate(to._id, {
        sequence: +from.sequence,
      });

      response = true;
    } catch (error) {
      response = false;
    }
    return response;
  }

  /* --------------------------------- Chapter -------------------------------- */

  static async addChapter(reqData) {
    let response;

    try {
      let checkSlug;
      let createSlug;
      const sequence = await this.findLastSequence(Chapter, {
        book_id: Types.ObjectId(reqData.book_id),
      });

      let images = [];

      if (reqData.files) {
        images = reqData.files.map((image) => `/chapter/${image.filename}`);
      }

      if (reqData.chapter_name) {
        createSlug = removeSpaceAndReplace(
          reqData.chapter_name.replace(/[^a-zA-Z ]/g, ''),
          '-',
        );

        checkSlug = await Chapter.findOne({
          slug: createSlug,
        });
      }

      if (checkSlug) {
        createSlug = createSlug + '-' + Math.floor(Date.now() / 1000);
      }

      const queryObject = {
        ...reqData,
        slug: createSlug,
        images,
        sequence,
      };

      const createChapter = await this.addData(Chapter, queryObject);

      response = new Response(201, 'T', createChapter).common(
        'CREATE',
        'Chapter',
      );
    } catch (error) {
      response = new Response().custom(error.message);
    }
    return response;
  }

  /* ---------------------------------- Topic => Header1 --------------------------------- */

  static async addHeaderOne(reqData) {
    let response;

    try {
      const sequence = await this.findLastSequence(HeaderOne, {
        chapter_id: Types.ObjectId(reqData.chapter_id),
      });

      const queryObject = {
        ...reqData,
        sequence,
      };

      const createTopic = await this.addData(HeaderOne, queryObject);

      response = new Response(201, 'T', createTopic).common('CREATE', 'Topic');
    } catch (error) {
      response = new Response().custom(error.message);
    }

    return response;
  }
}
