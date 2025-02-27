import mongoose from 'mongoose';

import Book from '../../../schema/Book/Book.js';
import BookClone from '../../../schema/BookClone/BookClone.js';

import Chapter from '../../../schema/Book/Chapter.js';
import ChapterClone from '../../../schema/BookClone/ChapterClone.js';
import CreationHelpers from './core/Create.js';
import ReadHelpers from './core/Read.js';
import HeadersModel from './Headers.js';

import { findAndDelete } from '../../core/file-system.js';

const { Types } = mongoose;

export default class ChapterModel {
  static async addChapter(reqData) {
    let output;
    try {
      const sequence = await ReadHelpers.findLastSequence(Chapter, {
        book_id: Types.ObjectId(reqData.book_id),
      });

      const queryObject = {
        ...reqData,
        sequence,
      };

      output = await CreationHelpers.addData(Chapter, queryObject);
    } catch (error) {
      console.log('ERROR', error);
      output = false;
    }
    return output;
  }

  static async addChapterClone(reqData) {
    let output;
    try {
      const sequence = await ReadHelpers.findLastSequence(
        ChapterClone,
        {
          book_id_clone: Types.ObjectId(reqData.book_id_clone),
        },
        true,
      );

      const queryObject = {
        ...reqData,
        sequence_clone: sequence,
      };

      output = await CreationHelpers.addData(ChapterClone, queryObject);
    } catch (error) {
      console.log('ERROR', error);
      output = false;
    }
    return output;
  }

  static async listChapters(reqData) {
    const stages = [
      { $match: { _id: mongoose.Types.ObjectId(reqData.id) } },
      {
        $lookup: {
          from: 'chapters',
          localField: '_id',
          foreignField: 'book_id',
          as: 'chapters_data',
        },
      },
      { $unwind: '$chapters_data' },
      { $sort: { 'chapters_data.sequence': 1 } },
      {
        $group: {
          _id: '$_id',
          category_id: { $first: '$category_id' },
          author_id: { $first: '$author_id' },
          book_name: { $first: '$book_name' },
          book_image: { $first: '$book_image' },
          book_short_description: { $first: '$book_short_description' },
          book_description: { $first: '$book_description' },
          have_express_version: { $first: '$have_express_version' },
          is_published: { $first: '$is_published' },
          status: { $first: '$status' },
          chapter_data: { $push: '$chapters_data' },
        },
      },
    ];

    const output = await ReadHelpers.list(Book, stages);
    return output;
  }

  static async listChaptersAndHeader(reqData) {
    const stages = [
      { $match: { _id: mongoose.Types.ObjectId(reqData.id) } },
      {
        $lookup: {
          from: 'chapters',
          let: { book_id: '$_id' },
          pipeline: [
            { $addFields: { book_id: { $toObjectId: '$book_id' } } },
            {
              $match: { $expr: { $eq: ['$book_id', '$$book_id'] } },
            },
            {
              $lookup: {
                from: 'header_1',
                let: { chapter_id: '$_id' },
                pipeline: [
                  {
                    $addFields: { chapter_id: { $toObjectId: '$chapter_id' } },
                  },
                  {
                    $match: { $expr: { $eq: ['$chapter_id', '$$chapter_id'] } },
                  },
                  {
                    $lookup: {
                      from: 'header_2',
                      let: { header1_id: '$_id' },
                      pipeline: [
                        {
                          $addFields: {
                            header1_id: { $toObjectId: '$header1_id' },
                          },
                        },
                        {
                          $match: {
                            $expr: { $eq: ['$header1_id', '$$header1_id'] },
                          },
                        },
                        {
                          $lookup: {
                            from: 'header_3',
                            let: { header2_id: '$_id' },
                            pipeline: [
                              {
                                $addFields: {
                                  header2_id: { $toObjectId: '$header2_id' },
                                },
                              },
                              {
                                $match: {
                                  $expr: {
                                    $eq: ['$header2_id', '$$header2_id'],
                                  },
                                },
                              },
                              { $sort: { sequence: 1 } },
                              {
                                $project: {
                                  header_name: '$header3_name',
                                  header2_id: 1,
                                  type: 'header-3',
                                  header_type: 1,
                                  sequence: 1,
                                  public_visibility: 1,
                                  book_slug: 1,
                                  chapter_slug: 1,
                                  header1_slug: 1,
                                  header2_slug: 1,
                                  slug: 1,
                                },
                              },
                            ],
                            as: 'header_data',
                          },
                        },
                        { $sort: { sequence: 1 } },
                        {
                          $project: {
                            header_name: '$header2_name',
                            header1_id: 1,
                            type: 'header-2',
                            header_type: 1,
                            header_data: '$header_data',
                            sequence: 1,
                            public_visibility: 1,
                            book_slug: 1,
                            chapter_slug: 1,
                            header1_slug: 1,
                            slug: 1,
                          },
                        },
                      ],
                      as: 'header_data',
                    },
                  },
                  { $sort: { sequence: 1 } },
                  {
                    $project: {
                      header_name: '$header1_name',
                      chapter_id: 1,
                      type: 'header-1',
                      header_type: 1,
                      header_data: '$header_data',
                      sequence: 1,
                      public_visibility: 1,
                      book_slug: 1,
                      chapter_slug: 1,
                      slug: 1,
                    },
                  },
                ],
                as: 'header_data',
              },
            },
            { $sort: { sequence: 1 } },
          ],
          as: 'chapter_data',
        },
      },
    ];

    const output = await ReadHelpers.list(Book, stages);
    return output;
  }

  static async listChaptersAndHeaderClone(reqData) {
    const stages = [
      { $match: { _id: mongoose.Types.ObjectId(reqData.id) } },
      {
        $lookup: {
          from: 'chapter_clones',
          let: { book_id_clone: '$_id' },
          pipeline: [
            {
              $addFields: { book_id_clone: { $toObjectId: '$book_id_clone' } },
            },
            {
              $match: { $expr: { $eq: ['$book_id_clone', '$$book_id_clone'] } },
            },
            {
              $lookup: {
                from: 'header_1_clones',
                let: { chapter_id_clone: '$_id' },
                pipeline: [
                  {
                    $addFields: {
                      chapter_id_clone: { $toObjectId: '$chapter_id_clone' },
                    },
                  },
                  {
                    $match: {
                      $expr: {
                        $eq: ['$chapter_id_clone', '$$chapter_id_clone'],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: 'header_2_clones',
                      let: { header1_id_clone: '$_id' },
                      pipeline: [
                        {
                          $addFields: {
                            header1_id_clone: {
                              $toObjectId: '$header1_id_clone',
                            },
                          },
                        },
                        {
                          $match: {
                            $expr: {
                              $eq: ['$header1_id_clone', '$$header1_id_clone'],
                            },
                          },
                        },
                        {
                          $lookup: {
                            from: 'header_3_clones',
                            let: { header2_id_clone: '$_id' },
                            pipeline: [
                              {
                                $addFields: {
                                  header2_id_clone: {
                                    $toObjectId: '$header2_id_clone',
                                  },
                                },
                              },
                              {
                                $match: {
                                  $expr: {
                                    $eq: [
                                      '$header2_id_clone',
                                      '$$header2_id_clone',
                                    ],
                                  },
                                },
                              },
                              { $sort: { sequence_clone: 1 } },
                              {
                                $project: {
                                  header_name: '$header3_name_clone',
                                  type: 'header-3-clone',
                                  header_type: 1,
                                  sequence_clone: 1,
                                  book_slug_clone: 1,
                                  chapter_slug_clone: 1,
                                  header1_slug_clone: 1,
                                  header2_slug_clone: 1,
                                  slug: 1,
                                },
                              },
                            ],
                            as: 'header_data',
                          },
                        },
                        { $sort: { sequence_clone: 1 } },
                        {
                          $project: {
                            header_name: '$header2_name_clone',
                            type: 'header-2-clone',
                            header_type: 1,
                            header_data: '$header_data',
                            sequence_clone: 1,
                            book_slug_clone: 1,
                            chapter_slug_clone: 1,
                            header1_slug_clone: 1,
                            slug: 1,
                          },
                        },
                      ],
                      as: 'header_data',
                    },
                  },
                  { $sort: { sequence_clone: 1 } },
                  {
                    $project: {
                      header_name: '$header1_name_clone',
                      type: 'header-1-clone',
                      header_type: 1,
                      header_data: '$header_data',
                      sequence_clone: 1,
                      book_slug_clone: 1,
                      chapter_slug_clone: 1,
                      slug: 1,
                    },
                  },
                ],
                as: 'header_data',
              },
            },
            { $sort: { sequence_clone: 1 } },
          ],
          as: 'chapter_data',
        },
      },
    ];

    const output = await ReadHelpers.list(BookClone, stages);
    return output;
  }

  static async listChapterAndHeaderChild(reqData) {
    const stages = [
      { $match: { _id: mongoose.Types.ObjectId(reqData.id) } },
      {
        $lookup: {
          from: 'header_1',
          let: { chapter_id: '$_id' },
          pipeline: [
            { $addFields: { chapter_id: { $toObjectId: '$chapter_id' } } },
            {
              $match: { $expr: { $eq: ['$chapter_id', '$$chapter_id'] } },
            },
            {
              $lookup: {
                from: 'header_2',
                let: { header1_id: '$_id' },
                pipeline: [
                  {
                    $addFields: { header1_id: { $toObjectId: '$header1_id' } },
                  },
                  {
                    $match: { $expr: { $eq: ['$header1_id', '$$header1_id'] } },
                  },
                  {
                    $lookup: {
                      from: 'header_3',
                      let: { header2_id: '$_id' },
                      pipeline: [
                        {
                          $addFields: {
                            header2_id: { $toObjectId: '$header2_id' },
                          },
                        },
                        {
                          $match: {
                            $expr: { $eq: ['$header2_id', '$$header2_id'] },
                          },
                        },
                        { $sort: { sequence: 1 } },
                        {
                          $project: {
                            book_id: '$book_id',
                            header_name: '$header3_name',
                            type: 'header-3',
                            header_type: 1,
                            sequence: 1,
                            public_visibility: 1,
                            book_slug: 1,
                            chapter_slug: 1,
                            header1_slug: 1,
                            header2_slug: 1,
                            slug: 1,

                            regular_content: {
                              $switch: {
                                branches: [
                                  {
                                    case: {
                                      $eq: [reqData.content_type, 'REGULAR'],
                                    },
                                    then: '$header3_content',
                                  },
                                  {
                                    case: {
                                      $eq: [reqData.content_type, 'BOTH'],
                                    },
                                    then: '$header3_content',
                                  },
                                ],
                                default: 0,
                              },
                            },

                            express_content: {
                              $switch: {
                                branches: [
                                  {
                                    case: {
                                      $eq: [reqData.content_type, 'EXPRESS'],
                                    },
                                    then: '$header3_express_content',
                                  },
                                  {
                                    case: {
                                      $eq: [reqData.content_type, 'BOTH'],
                                    },
                                    then: '$header3_express_content',
                                  },
                                ],
                                default: 0,
                              },
                            },
                          },
                        },
                      ],
                      as: 'header_data',
                    },
                  },
                  { $sort: { sequence: 1 } },
                  {
                    $project: {
                      book_id: '$book_id',
                      header_name: '$header2_name',
                      type: 'header-2',
                      header_type: 1,
                      sequence: 1,
                      public_visibility: 1,
                      book_slug: 1,
                      chapter_slug: 1,
                      header1_slug: 1,
                      slug: 1,

                      regular_content: {
                        $switch: {
                          branches: [
                            {
                              case: { $eq: [reqData.content_type, 'REGULAR'] },
                              then: '$header2_content',
                            },
                            {
                              case: { $eq: [reqData.content_type, 'BOTH'] },
                              then: '$header2_content',
                            },
                          ],
                          default: 0,
                        },
                      },

                      express_content: {
                        $switch: {
                          branches: [
                            {
                              case: { $eq: [reqData.content_type, 'EXPRESS'] },
                              then: '$header2_express_content',
                            },
                            {
                              case: { $eq: [reqData.content_type, 'BOTH'] },
                              then: '$header2_express_content',
                            },
                          ],
                          default: 0,
                        },
                      },

                      header_data: '$header_data',
                    },
                  },
                ],
                as: 'header_data',
              },
            },
            {
              $sort: { sequence: 1 },
            },
            {
              $project: {
                book_id: '$book_id',
                header_name: '$header1_name',
                type: 'header-1',
                header_type: 1,
                sequence: 1,
                public_visibility: 1,
                book_slug: 1,
                chapter_slug: 1,
                slug: 1,

                regular_content: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: [reqData.content_type, 'REGULAR'] },
                        then: '$header1_content',
                      },
                      {
                        case: { $eq: [reqData.content_type, 'BOTH'] },
                        then: '$header1_content',
                      },
                    ],
                    default: 0,
                  },
                },

                express_content: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: [reqData.content_type, 'EXPRESS'] },
                        then: '$header1_express_content',
                      },
                      {
                        case: { $eq: [reqData.content_type, 'BOTH'] },
                        then: '$header1_express_content',
                      },
                    ],
                    default: 0,
                  },
                },

                header_data: '$header_data',
              },
            },
          ],
          as: 'header_data',
        },
      },
      {
        $project: {
          _id: 1,
          book_id: 1,
          chapter_name: 1,
          type: 'chapter',
          image: 1,
          sequence: 1,
          public_visibility: 1,
          book_slug: 1,
          slug: 1,

          regular_content: {
            $switch: {
              branches: [
                {
                  case: { $eq: [reqData.content_type, 'REGULAR'] },
                  then: '$chapter_content',
                },
                {
                  case: { $eq: [reqData.content_type, 'BOTH'] },
                  then: '$chapter_content',
                },
              ],
              default: 0,
            },
          },

          express_content: {
            $switch: {
              branches: [
                {
                  case: { $eq: [reqData.content_type, 'EXPRESS'] },
                  then: '$chapter_express_content',
                },
                {
                  case: { $eq: [reqData.content_type, 'BOTH'] },
                  then: '$chapter_express_content',
                },
              ],
              default: 0,
            },
          },

          header_data: '$header_data',
        },
      },
    ];

    const output = await ReadHelpers.list(Chapter, stages);
    return output;
  }

  static async listChapterAndHeaderChildClone(reqData) {
    const stages = [
      { $match: { _id: mongoose.Types.ObjectId(reqData.id) } },
      {
        $lookup: {
          from: 'header_1_clones',
          let: { chapter_id_clone: '$_id' },
          pipeline: [
            {
              $addFields: {
                chapter_id_clone: { $toObjectId: '$chapter_id_clone' },
              },
            },
            {
              $match: {
                $expr: { $eq: ['$chapter_id_clone', '$$chapter_id_clone'] },
              },
            },
            {
              $lookup: {
                from: 'header_2_clones',
                let: { header1_id_clone: '$_id' },
                pipeline: [
                  {
                    $addFields: {
                      header1_id_clone: { $toObjectId: '$header1_id_clone' },
                    },
                  },
                  {
                    $match: {
                      $expr: {
                        $eq: ['$header1_id_clone', '$$header1_id_clone'],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: 'header_3_clones',
                      let: { header2_id_clone: '$_id' },
                      pipeline: [
                        {
                          $addFields: {
                            header2_id_clone: {
                              $toObjectId: '$header2_id_clone',
                            },
                          },
                        },
                        {
                          $match: {
                            $expr: {
                              $eq: ['$header2_id_clone', '$$header2_id_clone'],
                            },
                          },
                        },
                        { $sort: { sequence_clone: 1 } },
                        {
                          $project: {
                            book_id_clone: '$book_id_clone',
                            header_name: '$header3_name_clone',
                            header_type: 1,
                            sequence_clone: 1,
                            header_content: '$header3_content_clone',
                            type: 'header-3-clone',
                            book_slug_clone: 1,
                            chapter_slug_clone: 1,
                            header1_slug_clone: 1,
                            header2_slug_clone: 1,
                            slug: 1,
                          },
                        },
                      ],
                      as: 'header_data',
                    },
                  },
                  { $sort: { sequence_clone: 1 } },
                  {
                    $project: {
                      book_id_clone: '$book_id_clone',
                      header_name: '$header2_name_clone',
                      header_type: 1,
                      sequence_clone: 1,
                      header_content: '$header2_content_clone',
                      type: 'header-2-clone',
                      header_data: '$header_data',
                      book_slug_clone: 1,
                      chapter_slug_clone: 1,
                      header1_slug_clone: 1,
                      slug: 1,
                    },
                  },
                ],
                as: 'header_data',
              },
            },
            {
              $sort: { sequence_clone: 1 },
            },
            {
              $project: {
                book_id_clone: '$book_id_clone',
                header_name: '$header1_name_clone',
                header_type: 1,
                sequence_clone: 1,
                header_content: '$header1_content_clone',
                type: 'header-1-clone',
                header_data: '$header_data',
                book_slug_clone: 1,
                chapter_slug_clone: 1,
                slug: 1,
              },
            },
          ],
          as: 'header_data',
        },
      },
      {
        $project: {
          _id: 1,
          book_id_clone: 1,
          chapter_name_clone: 1,
          sequence_clone: 1,
          images_clone: 1,
          chapter_content_clone: 1,
          type: 'chapter-clone',
          edited_by: 1,
          header_data: '$header_data',
          book_slug_clone: 1,
          slug: 1,
        },
      },
    ];

    const output = await ReadHelpers.list(ChapterClone, stages);
    return output;
  }

  static async updateChapter(reqData, files = false) {
    let data;
    try {
      let updateObj = { ...reqData };

      if (files) {
        updateObj = { ...reqData, $push: { image: reqData.files } };
      }

      const updatedChapterData = await Chapter.findByIdAndUpdate(
        mongoose.Types.ObjectId(reqData.id),
        updateObj,
        { 
          new: true,
          populate: {
            path: 'book_id',
            select: 'book_name slug'
          }
        }
      );

      // Ensure we have the slugs in the response
      data = {
        ...updatedChapterData.toObject(),
        book_slug: updatedChapterData.book_id.slug,
        chapter_slug: updatedChapterData.slug
      };
    } catch (error) {
      data = new Error(error.message);
    }
    return data;
  }

  static async updateChapterClone(reqData, files = false) {
    let data;
    try {
      let updateObj = { ...reqData };

      if (files) {
        updateObj = { ...reqData, $push: { image: reqData.files } };
      }

      const updatedChapterData = await ChapterClone.findByIdAndUpdate(
        mongoose.Types.ObjectId(reqData.id),
        updateObj,
        { new: true },
      );

      data = updatedChapterData;
    } catch (error) {
      data = new Error(error.message);
    }
    return data;
  }

  static async deleteChapterChildren(reqData) {
    let data;
    try {
      const findSubDataStages = [
        { $match: { _id: mongoose.Types.ObjectId(reqData.id) } },
        {
          $lookup: {
            from: 'header_1',
            let: { chapter_id: '$_id' },
            pipeline: [
              { $addFields: { chapter_id: { $toObjectId: '$chapter_id' } } },
              {
                $match: { $expr: { $eq: ['$chapter_id', '$$chapter_id'] } },
              },
              {
                $lookup: {
                  from: 'header_2',
                  let: { header1_id: '$_id' },
                  pipeline: [
                    {
                      $addFields: {
                        header1_id: { $toObjectId: '$header1_id' },
                      },
                    },
                    {
                      $match: {
                        $expr: { $eq: ['$header1_id', '$$header1_id'] },
                      },
                    },
                    {
                      $lookup: {
                        from: 'header_3',
                        let: { header2_id: '$_id' },
                        pipeline: [
                          {
                            $addFields: {
                              header2_id: { $toObjectId: '$header2_id' },
                            },
                          },
                          {
                            $match: {
                              $expr: { $eq: ['$header2_id', '$$header2_id'] },
                            },
                          },
                        ],
                        as: 'headers3',
                      },
                    },
                  ],
                  as: 'headers2',
                },
              },
            ],
            as: 'headers1',
          },
        },
        {
          $project: {
            _id: 1,
            chapter_name: 1,
            image: 1,
            type: 'chapter',

            'headers1._id': 1,
            'headers1.header1_name': 1,
            'headers1.type': 'header-1',

            'headers1.headers2._id': 1,
            'headers1.headers2.header1_name': 1,
            'headers1.headers2.type': 'header-2',

            'headers1.headers2.headers3._id': 1,
            'headers1.headers2.headers3.header3_name': 1,
            'headers1.headers2.headers3.type': 'header-3',
          },
        },
      ];

      const listData = await Chapter.aggregate(findSubDataStages);

      if (listData.length > 0) {
        for await (const chapter of listData) {
          if (chapter?.image?.length > 0) {
            chapter.image.forEach((image) => {
              findAndDelete(`/uploads${image}`);
            });
          }

          await Chapter.findByIdAndDelete(chapter._id);

          if (chapter.headers1.length > 0) {
            for await (const header1 of chapter.headers1) {
              const header1Obj = { id: header1._id, header: header1.type };
              await HeadersModel.deleteIndividual(header1Obj);

              if (header1.headers2.length > 0) {
                for await (const header2 of header1.headers2) {
                  const header2Obj = { id: header2._id, header: header2.type };
                  await HeadersModel.deleteIndividual(header2Obj);

                  if (header2.headers3.length > 0) {
                    for await (const header3 of header2.headers3) {
                      const header3Obj = {
                        id: header3._id,
                        header: header3.type,
                      };
                      await HeadersModel.deleteIndividual(header3Obj);
                    }
                  }
                }
              }
            }
          }
        }
      }

      data = listData;
    } catch (error) {
      data = new Error(error.message);
    }
    return data;
  }

  static async deleteChapterChildrenClone(reqData) {
    let data;
    try {
      const findSubDataStages = [
        { $match: { _id: mongoose.Types.ObjectId(reqData.id) } },
        {
          $lookup: {
            from: 'header_1_clones',
            let: { chapter_id_clone: '$_id' },
            pipeline: [
              {
                $addFields: {
                  chapter_id_clone: { $toObjectId: '$chapter_id_clone' },
                },
              },
              {
                $match: {
                  $expr: { $eq: ['$chapter_id_clone', '$$chapter_id_clone'] },
                },
              },
              {
                $lookup: {
                  from: 'header_2_clones',
                  let: { header1_id_clone: '$_id' },
                  pipeline: [
                    {
                      $addFields: {
                        header1_id_clone: {
                          $toObjectId: '$header1_id_clone',
                        },
                      },
                    },
                    {
                      $match: {
                        $expr: {
                          $eq: ['$header1_id_clone', '$$header1_id_clone'],
                        },
                      },
                    },
                    {
                      $lookup: {
                        from: 'header_3_clones',
                        let: { header2_id_clone: '$_id' },
                        pipeline: [
                          {
                            $addFields: {
                              header2_id_clone: {
                                $toObjectId: '$header2_id_clone',
                              },
                            },
                          },
                          {
                            $match: {
                              $expr: {
                                $eq: [
                                  '$header2_id_clone',
                                  '$$header2_id_clone',
                                ],
                              },
                            },
                          },
                        ],
                        as: 'headers3',
                      },
                    },
                  ],
                  as: 'headers2',
                },
              },
            ],
            as: 'headers1',
          },
        },
        {
          $project: {
            _id: 1,
            chapter_name_clone: 1,
            images_clone: 1,
            type: 'chapter-clone',

            'headers1._id': 1,
            'headers1.header1_name_clone': 1,
            'headers1.type': 'header-1-clone',

            'headers1.headers2._id': 1,
            'headers1.headers2.header2_name_clone': 1,
            'headers1.headers2.type': 'header-2-clone',

            'headers1.headers2.headers3._id': 1,
            'headers1.headers2.headers3.header3_name_clone': 1,
            'headers1.headers2.headers3.type': 'header-3-clone',
          },
        },
      ];

      const listData = await ChapterClone.aggregate(findSubDataStages);

      if (listData.length > 0) {
        for await (const chapter of listData) {
          if (chapter.images_clone && chapter.images_clone.length > 0) {
            for (const image of chapter.images_clone) {
              findAndDelete(`/uploads${image}`);
            }
          }

          await ChapterClone.findByIdAndDelete(chapter._id);

          if (chapter.headers1.length > 0) {
            for await (const header1 of chapter.headers1) {
              const header1Obj = { id: header1._id, header: header1.type };
              await HeadersModel.deleteIndividual(header1Obj);
              if (header1.headers2.length > 0) {
                for await (const header2 of header1.headers2) {
                  const header2Obj = { id: header2._id, header: header2.type };

                  await HeadersModel.deleteIndividual(header2Obj);
                  if (header2.headers3.length > 0) {
                    for await (const header3 of header2.headers3) {
                      const header3Obj = {
                        id: header3._id,
                        header: header3.type,
                      };
                      await HeadersModel.deleteIndividual(header3Obj);
                    }
                  }
                }
              }
            }
          }
        }
      }

      data = listData;
    } catch (error) {
      data = new Error(error.message);
    }
    return data;
  }

  static async deleteChapterCloneChildren(reqData) {
    let data;
    try {
      const findSubDataStages = [
        { $match: { _id: mongoose.Types.ObjectId(reqData.id) } },
        {
          $lookup: {
            from: 'header_1_clones',
            let: { chapter_id: '$_id' },
            pipeline: [
              { $addFields: { chapter_id: { $toObjectId: '$chapter_id' } } },
              {
                $match: { $expr: { $eq: ['$chapter_id', '$$chapter_id'] } },
              },
              {
                $lookup: {
                  from: 'header_2',
                  let: { header1_id: '$_id' },
                  pipeline: [
                    {
                      $addFields: {
                        header1_id: { $toObjectId: '$header1_id' },
                      },
                    },
                    {
                      $match: {
                        $expr: { $eq: ['$header1_id', '$$header1_id'] },
                      },
                    },
                    {
                      $lookup: {
                        from: 'header_3',
                        let: { header2_id: '$_id' },
                        pipeline: [
                          {
                            $addFields: {
                              header2_id: { $toObjectId: '$header2_id' },
                            },
                          },
                          {
                            $match: {
                              $expr: { $eq: ['$header2_id', '$$header2_id'] },
                            },
                          },
                        ],
                        as: 'headers3',
                      },
                    },
                  ],
                  as: 'headers2',
                },
              },
            ],
            as: 'headers1',
          },
        },
        {
          $project: {
            _id: 1,
            chapter_name: 1,
            image: 1,
            type: 'chapter',

            'headers1._id': 1,
            'headers1.header1_name': 1,
            'headers1.type': 'header-1',

            'headers1.headers2._id': 1,
            'headers1.headers2.header1_name': 1,
            'headers1.headers2.type': 'header-2',

            'headers1.headers2.headers3._id': 1,
            'headers1.headers2.headers3.header3_name': 1,
            'headers1.headers2.headers3.type': 'header-3',
          },
        },
      ];

      const listData = await Chapter.aggregate(findSubDataStages);

      if (listData.length > 0) {
        for await (const chapter of listData) {
          if (chapter.image.length > 0) {
            chapter.image.forEach((image) => {
              findAndDelete(`/uploads${image}`);
            });
          }

          await Chapter.findByIdAndDelete(chapter._id);

          if (chapter.headers1.length > 0) {
            for await (const header1 of chapter.headers1) {
              const header1Obj = { id: header1._id, type: header1.type };
              await HeadersModel.deleteIndividual(header1Obj);

              if (header1.headers2.length > 0) {
                for await (const header2 of header1.headers2) {
                  const header2Obj = { id: header2._id, type: header2.type };
                  await HeadersModel.deleteIndividual(header2Obj);

                  if (header2.headers3.length > 0) {
                    for await (const header3 of header2.headers3) {
                      const header3Obj = {
                        id: header3._id,
                        type: header3.type,
                      };
                      await HeadersModel.deleteIndividual(header3Obj);
                    }
                  }
                }
              }
            }
          }
        }
      }

      data = listData;
    } catch (error) {
      data = new Error(error.message);
    }
    return data;
  }
}
