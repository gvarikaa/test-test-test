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
      const response = await axios.put(url, data, {
        headers: {
          'AccessKey': this.apiKey,
          'Content-Type': 'application/octet-stream',
          ...headers
        }
      });
      
      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        message: response.statusText,
        data: response.data
      };
    } catch (error) {
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