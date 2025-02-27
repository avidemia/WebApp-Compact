import { getChapterName } from '../../helpers/util/util.js';
import BookChapterName from '../../schema/BookChapterName/BookChapterName.js';
import Response from '../../helpers/Response.js';

class BookChapterNameModel {
  static async put({ book_id, name }) {
    const exist = await BookChapterName.findOne({
      book_id,
    });

    if (exist) {
      await BookChapterName.updateOne({ book_id }, { names: name });
    } else {
      await BookChapterName.create({
        book_id,
        names: name,
      });
    }
  }

  static async get(reqData) {
    const data = await BookChapterName.findOne({
      book_id: reqData.book_id,
    });

    return new Response(200, 'T', data);
  }

  static async addExclude(reqData) {
    const { book_id, exclude_id } = reqData;

    if (!book_id || !exclude_id) {
      return new Response(400, 'F', 'Invalid data');
    }

    const exist = await BookChapterName.findOne({ book_id });

    if (exist) {
      const excludeData = exist.exclude || [];

      const find = excludeData.find((e) => e === exclude_id);

      if (!find) {
        excludeData.push(exclude_id);
        await BookChapterName.updateOne({ book_id }, { exclude: excludeData });
      }
    } else {
      await BookChapterName.create({
        book_id,
        exclude: [exclude_id],
      });
    }

    return new Response(200, 'T').custom('Exclude added');
  }

  static async toggleExclude(reqData) {
    const { book_id, exclude_id } = reqData;
    if (!book_id || !exclude_id) {
      return new Response(400, 'F', 'Invalid data');
    }

    const exist = await BookChapterName.findOne({ book_id });

    if (exist) {
      const excludeData = exist.exclude || [];

      const findIndex = excludeData.findIndex((e) => e === exclude_id);

      if (findIndex > -1) {
        excludeData.splice(findIndex, 1);
      } else {
        excludeData.push(exclude_id);
      }

      await BookChapterName.updateOne({ book_id }, { exclude: excludeData });
    } else {
      await BookChapterName.create({
        book_id,
        exclude: [exclude_id],
      });
    }

    return new Response(200, 'T').custom('Exclude toggled');
  }

  static async removeExclude(reqData) {
    const { book_id, exclude_id } = reqData;

    if (!book_id || !exclude_id) {
      return new Response(400, 'F', 'Invalid data');
    }

    const exist = await BookChapterName.findOne({ book_id });

    if (exist) {
      const excludeData = exist.exclude || [];

      const findIndex = excludeData.findIndex((e) => e === exclude_id);

      if (findIndex > -1) {
        excludeData.splice(findIndex, 1);
        await BookChapterName.updateOne({ book_id }, { exclude: excludeData });
      }
    }

    return new Response(200, 'T').custom('Exclude removed');
  }

  static async addNameToChapter(bookContent, isClone = false) {
    console.log(bookContent);
    try {
      const newBookContent = Object.create(
        Object.getPrototypeOf(bookContent),
        Object.getOwnPropertyDescriptors(bookContent),
      );

      const oldNames = await BookChapterName.findOne({
        book_id: newBookContent._id,
      });

      const data = newBookContent.index[0].chapter_data || [];
      const type = newBookContent.chapter_name_type || 1;

      const names = [];
      let totalHeaders = -1;
      for (let i = 0; i < data.length; i += 1) {
        const chapter = data[i];
        const oldName = isClone
          ? chapter.chapter_name_clone
          : chapter.chapter_name;

        let isExclude = false;
        if (oldNames && oldNames.exclude) {
          const find = oldNames.exclude.find(
            (e) => e === chapter._id.toString(),
          );
          if (find) {
            isExclude = true;
          }
        }

        const chapterName = isExclude
          ? oldName
          : getChapterName(type, oldName, i);

        names.push({
          content_id: chapter._id,
          name: chapterName,
          slug: chapter.slug,
        });

        if (isClone) {
          newBookContent.index[0].chapter_data[i].chapter_name_clone =
            chapterName;
        } else {
          newBookContent.index[0].chapter_data[i].chapter_name = chapterName;
        }

        const headerData = chapter.header_data;

        for (let j = 0; j < headerData.length; j += 1) {
          totalHeaders += 1;

          let isExcludeHeader = false;

          if (oldNames && oldNames.exclude) {
            const find = oldNames.exclude.find(
              (e) => e === headerData[j]._id.toString(),
            );
            if (find) {
              isExcludeHeader = true;
            }
          }

          const header = headerData[j];
          const oldHeaderName = header.header_name;
          const headerName = isExcludeHeader
            ? oldHeaderName
            : getChapterName(type, oldHeaderName, j, true, i, totalHeaders);

          names.push({
            content_id: header._id,
            name: headerName,
            slug: header.slug,
          });

          newBookContent.index[0].chapter_data[i].header_data[j].header_name =
            headerName;

          const subHeaderData = headerData[j].header_data;
          for (let k = 0; k < subHeaderData.length; k += 1) {
            totalHeaders += 1;
            const subHeader = subHeaderData[k];
            const subHeaderName = getChapterName(
              type,
              subHeader.header_name,
              k,
              true,
              i,
              totalHeaders,
              j,
              true,
            );

            names.push({
              content_id: subHeader._id,
              name: subHeaderName,
              slug: subHeader.slug,
            });

            if (isClone) {
              newBookContent.index[0].chapter_data[i].header_data[
                j
              ].header_data[k].header_name_clone = subHeaderName;
            } else {
              newBookContent.index[0].chapter_data[i].header_data[
                j
              ].header_data[k].header_name = subHeaderName;
            }
          }
        }
      }

      await BookChapterNameModel.put({
        book_id: newBookContent._id,
        name: names,
      });

      return newBookContent;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
}

export default BookChapterNameModel;
