import api from './api';
import { Platform } from 'react-native';

export const uploadService = {
  /**
   * Upload a single image
   */
  uploadImage: async (uri: string): Promise<string> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('image', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      name: filename,
      type,
    } as any);

    try {
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data.url;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },

  /**
   * Upload multiple images
   */
  uploadMultipleImages: async (uris: string[]): Promise<string[]> => {
    const formData = new FormData();

    uris.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `upload-${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('images', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type,
      } as any);
    });

    try {
      const response = await api.post('/upload/multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data.urls;
    } catch (error) {
      console.error('Multiple upload error:', error);
      throw error;
    }
  },
};

