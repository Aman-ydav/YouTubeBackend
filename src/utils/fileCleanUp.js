import fs from "fs";

export const cleanupLocalFiles = (files) => {
  if (!files) return;
  Object.values(files)
    .flat()
    .forEach((file) => {
      if (file?.path) {
        fs.unlink(file.path, (err) => {
          if (err) console.error("Failed to cleanup local file:", file.path, err);
        });
      }
    });
};