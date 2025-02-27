import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const bookChapterNameSchema = new Schema({
  book_id: { type: Schema.Types.ObjectId, unique: true },
  names: [Object],
  exclude: [String],
});

const BookChapterName = model('book_chapter_name', bookChapterNameSchema);

export default BookChapterName;
