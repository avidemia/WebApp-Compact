import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const chapterSchema = new Schema({
  book_id: { type: Schema.Types.ObjectId, ref: 'books' },
  chapter_name: { type: String },
  sequence: { type: Number },
  chapter_content: { type: String },
  chapter_express_content: { type: String },
  public_visibility: { type: Boolean, default: false },
  allow_part_see: { type: Boolean, default: false },
  book_slug: { type: String },
  slug: { type: String },
  regular_authors: { type: String },
  express_authors: { type: String },
  created_at: { type: Schema.Types.Date, default: new Date().getTime() },
  update_at: { type: Schema.Types.Date },
  contextFiles: [{ type: String }],
});

const Chapter = model('chapter', chapterSchema);
export default Chapter;
