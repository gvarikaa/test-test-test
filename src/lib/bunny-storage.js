// აქ ვქმნით შუამავალ bunny-storage იმპლემენტაციას
// რომელიც გვერდს უვლის Node.js 20+ მოთხოვნას

import axios from 'axios';

/**
 * Bunny Storage მარტივი იმპლემენტაცია Node.js 18.x-სთვის
 */
export class BunnyStorage {
  constructor(options) {
    this.storageZoneName = options.storageZoneName;
    this.apiKey = options.apiKey;
    this.region = options.region || 'la';
    this.baseUrl = `https://${this.region}.storage.bunnycdn.com/${this.storageZoneName}/`;
  }

  /**
   * ფაილის ატვირთვა
   */
  async upload(path, data, headers = {}) {
    try {
      const url = this.baseUrl + path;
      console.log(`Bunny.upload: Attempting upload to URL: ${url} (Size: ${data.length} bytes)`);
      console.log(`Bunny.upload: Using storage zone: ${this.storageZoneName}, region: ${this.region}`);

      // Try to see if parent folder exists
      try {
        const parentFolder = path.substring(0, path.lastIndexOf('/'));
        if (parentFolder) {
          console.log(`Bunny.upload: Checking if parent folder exists: ${parentFolder}`);
          const folderCheck = await axios.get(this.baseUrl + parentFolder, {
            headers: {
              'AccessKey': this.apiKey
            }
          });
          console.log(`Bunny.upload: Parent folder check result:`, {
            status: folderCheck.status,
            exists: folderCheck.status >= 200 && folderCheck.status < 300
          });
        }
      } catch (folderError) {
        console.log(`Bunny.upload: Parent folder check error:`, {
          status: folderError.response?.status,
          message: folderError.message
        });

        // If folder doesn't exist (404), try to create it
        if (folderError.response?.status === 404) {
          try {
            const parentFolder = path.substring(0, path.lastIndexOf('/'));
            if (parentFolder) {
              console.log(`Bunny.upload: Attempting to create parent folder: ${parentFolder}`);
              // This is usually how you'd create a folder - with a PUT and zero-byte content
              const createFolder = await axios.put(this.baseUrl + parentFolder, '', {
                headers: {
                  'AccessKey': this.apiKey,
                  'Content-Type': 'application/json'
                }
              });
              console.log(`Bunny.upload: Folder creation result:`, {
                status: createFolder.status
              });
            }
          } catch (createError) {
            console.log(`Bunny.upload: Folder creation error:`, {
              status: createError.response?.status,
              message: createError.message
            });
          }
        }
      }

      // Now try the upload
      const response = await axios.put(url, data, {
        headers: {
          'AccessKey': this.apiKey,
          'Content-Type': 'application/octet-stream',
          ...headers
        }
      });

      console.log(`Bunny.upload: Upload successful:`, {
        status: response.status,
        message: response.statusText
      });

      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        message: response.statusText,
        data: response.data
      };
    } catch (error) {
      console.error(`Bunny.upload: Upload failed:`, {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });

      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.message,
        data: error.response?.data
      };
    }
  }

  /**
   * ფაილის წაშლა
   */
  async delete(path) {
    try {
      const url = this.baseUrl + path;
      const response = await axios.delete(url, {
        headers: {
          'AccessKey': this.apiKey
        }
      });
      
      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        message: response.statusText
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.message
      };
    }
  }

  /**
   * ფაილის ჩამოტვირთვა
   */
  async download(path) {
    try {
      const url = this.baseUrl + path;
      const response = await axios.get(url, {
        headers: {
          'AccessKey': this.apiKey
        },
        responseType: 'arraybuffer'
      });
      
      return {
        success: true,
        statusCode: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.message
      };
    }
  }

  /**
   * ფაილის არსებობის შემოწმება
   */
  async exists(path) {
    try {
      const url = this.baseUrl + path;
      await axios.head(url, {
        headers: {
          'AccessKey': this.apiKey
        }
      });
      
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * ფაილების სიის მიღება
   */
  async list(path = '') {
    try {
      const url = this.baseUrl + path;
      const response = await axios.get(url, {
        headers: {
          'AccessKey': this.apiKey
        }
      });
      
      return {
        success: true,
        statusCode: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.message
      };
    }
  }
}