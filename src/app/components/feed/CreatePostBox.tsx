"use client";

import { useState } from 'react';
import Image from 'next/image';

export default function CreatePostBox() {
  const [text, setText] = useState('');
  
  return (
    <div className="card mb-4 overflow-hidden">
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Image 
            src="https://ui-avatars.com/api/?name=Test+User&background=4CAF50&color=fff"
            alt="Your profile" 
            width={40}
            height={40}
            className="h-10 w-10 rounded-full"
          />
          <input 
            type="text" 
            placeholder="What's on your mind?"
            className="flex-1 rounded-full bg-hover-bg px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:outline-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="mt-3 border-t border-border-color pt-2">
          <div className="flex justify-between">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-lg p-2 hover:bg-hover-bg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f03e3e" className="size-6">
                <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
              </svg>
              <span className="text-sm font-medium text-text-primary">Live video</span>
            </button>
            
            <button className="flex flex-1 items-center justify-center gap-2 rounded-lg p-2 hover:bg-hover-bg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#37b24d" className="size-6">
                <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-text-primary">Photo/video</span>
            </button>
            
            <button className="flex flex-1 items-center justify-center gap-2 rounded-lg p-2 hover:bg-hover-bg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f59f00" className="size-6">
                <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-text-primary">Feeling/activity</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}