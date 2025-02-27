import { resolve, join, extname } from 'path';
import fs from 'fs';

const dirname = resolve();

/* ---------------------- Check and Create Directories ---------------------- */
function readDirectory(dir) {
  const files = [];

  const dirPath = join(dirname, dir);

  function fetchFiles(checkDir = dirPath) {
    fs.readdirSync(checkDir).forEach((File) => {
      const Absolute = join(checkDir, File);
      if (fs.statSync(Absolute).isDirectory()) {
        return fetchFiles(Absolute);
      } else {
        if (extname(Absolute) === '.html') {
          return files.push(File);
        }
      }
    });
  }

  fetchFiles(dirPath);

  console.log(files);

  return files;
}
//   const files = [];
//   const dirPath = join(dirname, dir);

//   fs.readdirSync(dirPath).forEach((File) => {
//     const absolute = join(dirPath, File);
//     if (FS.statSync(absolute).isDirectory()) return ThroughDirectory(Absolute);
//     else return files.push(absolute);
//   });
//   console.log('PATH', dirPath);

//   console.log('\n');

//   console.log('CONTENT', dirContent);

//   return dirContent;
// }

function checkAndCreateDir(pathArray) {
  pathArray.forEach((uniquePath) => {
    if (!fs.existsSync(uniquePath)) {
      fs.mkdirSync(uniquePath);
    }
  });
}

/* ----------------------------- Rename and Move ---------------------------- */
async function renameAndMove(oldName, oldPath, newName, newPath) {
  const oldDir = join(dirname, oldPath, oldName);
  const trimName = oldName.slice(5, oldName.length);
  const newDir = join(dirname, newPath, `${newName}-${trimName}`);

  fs.renameSync(oldDir, newDir);
  return {
    image: `/${newPath.slice(8, newPath.filename)}/${newName}-${trimName}`,
    filename: `/${newPath}/${newName}-${trimName}`,
  };
}

/* ------------------------------- Move Files ------------------------------- */
function moveFile(oldPath, newPath) {
  fs.renameSync(oldPath, newPath);
  return newPath;
}

/* ----------------------------- Find and Delete ---------------------------- */
function findAndDelete(dirPath) {
  let response;
  const filePath = join(dirname, dirPath);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      response = true;
    } else {
      response = true;
    }
  } catch (error) {
    console.log(error);
    response = false;
  }
  return response;
}

function findAndDeleteDirectory(dirPath) {
  const dir = join(dirname, dirPath);
  fs.rmSync(dir, { recursive: true });
}

/* ------------------------------- Clear Junk ------------------------------- */
function clearJunk(reqObj) {
  const junkArray = [];
  if (reqObj?.file) {
    junkArray.push(reqObj?.file);
  }

  if (reqObj?.files) {
    junkArray.push(...reqObj.files);
  }

  junkArray.forEach((junk) => {
    const junkPath = `${junk.destination}/${junk.filename}`;
    findAndDelete(junkPath);
  });
}

export {
  checkAndCreateDir,
  readDirectory,
  renameAndMove,
  moveFile,
  findAndDelete,
  findAndDeleteDirectory,
  clearJunk,
};
