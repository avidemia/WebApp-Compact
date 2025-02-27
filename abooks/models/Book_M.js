import fs from 'fs';
import mongoose from 'mongoose';
import { join, resolve } from 'path';
import Response from '../helpers/Response.js';
import { addSlug } from '../helpers/third-party/custom.js';
import Book from '../schema/Book/Book.js';
import Chapter from '../schema/Book/Chapter.js';
import HeaderOne from '../schema/Book/Header1.js';
import HeaderTwo from '../schema/Book/Header2.js';
import HeaderThree from '../schema/Book/Header3.js';
import ReaderCount from '../schema/Reader/ReaderCount.js';

const ROOT_DIR = resolve();

class BookModel {
  static async addBook(reqData) {
    let response;
    try {
      let checkSlug;
      let createSlug;

      if (reqData.book_name) {
        createSlug = addSlug(reqData.book_name, '-');

        checkSlug = await Book.findOne({
          slug: createSlug,
        });
      }

      if (checkSlug) {
        createSlug = `${createSlug}-${Math.floor(Date.now() / 1000)}`;
      }

      const insertData = {
        ...reqData,
        slug: createSlug,
      };

      if (reqData?.file) {
        insertData.book_image = `/books/${reqData.file.filename}`;
      }

      const findBook = await Book.findOne({
        book_name: reqData.book_name,
      });

      if (findBook) {
        if (reqData.file) {
          const filePath = join(
            ROOT_DIR,
            `uploads/book/${reqData.file.filename}`,
          );
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        response = new Response(409, 'F').common('DUPLICATE', 'Book');
      } else {
        await Book.create(insertData);
        response = new Response(201, 'T').common('CREATE', 'Book');
      }
    } catch (error) {
      const filePath = join(ROOT_DIR, `uploads/books/${reqData.file.filename}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      response = new Response().custom(error.message);
    }
    return response;
  }

  static async listBook(reqData) {
    let response;
    try {
      if (reqData?.id) {
        const singleBookDetails = await Book.findById(reqData.id);
        response = new Response(200, 'T', singleBookDetails).common(
          'READ',
          'Book',
        );
      } else {
        const pagination = {
          skip: 0,
          limit: 10,
        };

        if (reqData.limit) {
          pagination.limit = Number(reqData.limit);
          if (reqData.page) {
            const skip = reqData.limit * (reqData.page - 1);
            pagination.skip = Number(skip);
            pagination.page = Number(reqData.page);
          }
        }

        const condition = [];

        if (reqData.search) {
          const bookSchema = {
            book_name: { type: 'STRING' },
            author_id: { type: 'ARRAY', objectId: true },
            category_id: { type: 'STRING', objectId: true },
            _id: { type: 'STRING', objectId: true },
          };

          const searchCondition = {
            $match: {
              $and: [],
            },
          };

          Object.keys(reqData.search).forEach((key) => {
            const searchObj = {};

            if (bookSchema[key].type === 'STRING') {
              if (bookSchema[key]?.objectId) {
                searchCondition.$match.$and.push({
                  [key]: mongoose.Types.ObjectId(reqData.search[key]),
                });
              } else {
                searchCondition.$match.$and.push({
                  [key]: new RegExp(reqData.search[key], 'i'),
                });
              }
            }

            if (bookSchema[key].type === 'ARRAY') {
              if (
                Array.isArray(reqData.search[key]) &&
                reqData.search[key].length > 1
              ) {
                let matchArray;

                if (bookSchema[key].objectId) {
                  matchArray = reqData.search[key].map((type) =>
                    mongoose.Types.ObjectId(type),
                  );
                } else {
                  matchArray = reqData.search[key].map((type) => type);
                }
                searchObj[key] = {
                  $in: matchArray,
                };

                searchCondition.$match.$and.push(searchObj);
              } else {
                if (bookSchema[key].objectId) {
                  searchObj[key] = mongoose.Types.ObjectId(reqData.search[key]);
                } else {
                  searchObj[key] = reqData.search[key];
                }

                searchCondition.$match.$and.push(searchObj);
              }
            }
          });

          condition.push(searchCondition);
        } else {
          condition.push({
            $match: {},
          });
        }

        condition.push(
          {
            $lookup: {
              from: 'book_categories',
              localField: 'category_id',
              foreignField: '_id',
              as: 'category_details',
            },
          },
          {
            $unwind: '$category_details',
          },
          {
            $lookup: {
              from: 'read_counts',
              localField: '_id',
              foreignField: 'book_id',
              as: 'read_count',
            },
          },
          {
            $project: {
              _id: 1,
              author_id: 1,
              book_name: 1,
              book_image: 1,
              status: 1,
              created_at: 1,
              book_description: 1,
              book_short_description: 1,
              have_express_version: 1,
              buy_regular_link: 1,
              buy_express_link: 1,
              slug: 1,
              sequence: 1,
              category_id: '$category_details._id',
              category_name: '$category_details.category_name',
              read_count: {
                $cond: {
                  if: { $isArray: '$read_count' },
                  then: { $size: '$read_count' },
                  else: 'NA',
                },
              },
            },
          },
          {
            $sort: {
              sequence: 1,
            },
          },
        );

        if (reqData.sort) {
          const sortCondition = {};
          Object.keys(reqData.sort).forEach((key) => {
            sortCondition[key] = +reqData.sort[key];
          });

          condition.push({
            $sort: sortCondition,
          });
        }

        const bookCounts = await Book.aggregate(condition);

        pagination.totalRecord = bookCounts.length;

        if (reqData?.limit && reqData?.page) {
          condition.push({
            $skip: pagination.skip,
          });

          condition.push({
            $limit: pagination.limit,
          });
        }

        const listBooks = await Book.aggregate(condition);

        response = new Response(200, 'T', listBooks).common('READ', 'Books');

        if (reqData?.limit && reqData?.page) {
          response.pagination = pagination;
        }
      }
    } catch (error) {
      response = new Response().custom(error.message);
    }
    return response;
  }

  static async updateBook(reqData) {
    let response;
    try {
      const updateObj = {
        ...reqData,
        updated_at: new Date().getTime(),
      };

      const findBook = await Book.findOne({
        _id: mongoose.Types.ObjectId(reqData.book_id),
      }).lean();

      if (findBook && reqData.file?.filename) {
        updateObj.book_image = `/books/${reqData.file.filename}`;

        const filePath = join(ROOT_DIR, 'uploads', findBook.book_image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      if (reqData.file?.filename) {
        updateObj.book_image = `/books/${reqData.file.filename}`;
      }

      const updatedBookData = await Book.updateOne(
        {
          _id: mongoose.Types.ObjectId(reqData.id),
        },
        updateObj,
        { new: true },
      ).lean();

      response = new Response(200, 'T', updatedBookData).common(
        'UPDATE',
        'Book Category',
      );
    } catch (error) {
      console.log(error);
      response = new Response().custom(error.message);
    }
    return response;
  }

  static async deleteBook(reqData) {
    let response;
    try {
      const findBook = await Book.findOne({
        _id: reqData.id,
      }).lean();

      if (findBook.book_image) {
        const filePath = join(ROOT_DIR, 'uploads', findBook.book_image);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await Promise.all([
        Book.findByIdAndDelete({
          _id: reqData.id,
        }),

        Chapter.deleteMany({
          book_id: reqData.id,
        }),

        HeaderOne.deleteMany({
          book_id: reqData.id,
        }),

        HeaderTwo.deleteMany({
          book_id: reqData.id,
        }),

        HeaderThree.deleteMany({
          book_id: reqData.id,
        }),

        ReaderCount.deleteMany({
          book_id: reqData.id,
        }),
      ]);

      response = new Response(200, 'T').common('DELETE', 'Book');
    } catch (error) {
      response = new Response().custom(error.message);
    }
    return response;
  }

  static async listCategoryBooks(reqData) {
    let response;
    try {
      const listBooks = await Book.aggregate([
        {
          $match: {
            category_id: mongoose.Types.ObjectId(reqData.id),
          },
        },
        {
          $lookup: {
            from: 'book_categories',
            localField: 'category_id',
            foreignField: '_id',
            as: 'category_details',
          },
        },
        {
          $unwind: '$category_details',
        },
        {
          $lookup: {
            from: 'read_counts',
            localField: '_id',
            foreignField: 'book_id',
            as: 'read_count',
          },
        },
        {
          $project: {
            _id: 1,
            author_id: 1,
            book_name: 1,
            sequence: 1,
            book_image: 1,
            status: 1,
            created_at: 1,
            book_description: 1,
            book_short_description: 1,
            have_express_version: 1,
            buy_regular_link: 1,
            buy_express_link: 1,
            slug: 1,
            category_id: '$category_details._id',
            category_name: '$category_details.category_name',
            read_count: {
              $cond: {
                if: { $isArray: '$read_count' },
                then: { $size: '$read_count' },
                else: 'NA',
              },
            },
          },
        },
        {
          $sort: {
            sequence: 1,
          },
        },
      ]);

      response = new Response(200, 'T', listBooks).common(
        'READ',
        'Category Books',
      );
    } catch (error) {
      response = new Response().custom(error.message);
    }
    return response;
  }

  static async updateBookSequence(reqData) {
    const { category_id, book_positions } = reqData;

    if (book_positions === undefined || !category_id) {
      return new Response(400, 'F').custom(
        'book_positions and category_id are required',
      );
    }

    try {
      const all = await Book.find({
        category_id,
      }).sort({ sequence: 1 });

      const promises = [];

      for (let i = 0; i < all.length; i += 1) {
        if (all[i]._id.toString() !== book_positions[i]) {
          const index = book_positions.findIndex(
            (c) => c === all[i]._id.toString(),
          );
          if (index !== -1) {
            all[i].sequence = index;
            promises.push(all[i].save());
          }
        }
      }

      await Promise.all(promises);

      return new Response(200, 'T', 'sequence updated');
    } catch (error) {
      console.log('Error in BookModel updateBookSequence()', error);
      return new Response(500, 'F').custom('Internal Server Error');
    }
  }
}

export default BookModel;
