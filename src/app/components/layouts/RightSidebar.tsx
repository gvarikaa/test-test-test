"use client";

import Image from 'next/image';

export default function RightSidebar() {
  // სათესტო მომხარებლების მონაცემები
  const contacts = [
    {
      id: '1',
      name: 'John Doe',
      image: 'https://ui-avatars.com/api/?name=John+Doe&background=FF5722&color=fff',
      online: true
    },
    {
      id: '2',
      name: 'Sarah Williams',
      image: 'https://ui-avatars.com/api/?name=Sarah+Williams&background=E91E63&color=fff',
      online: true
    },
    {
      id: '3',
      name: 'David Johnson',
      image: 'https://ui-avatars.com/api/?name=David+Johnson&background=4CAF50&color=fff',
      online: false
    },
    {
      id: '4',
      name: 'Emily Brown',
      image: 'https://ui-avatars.com/api/?name=Emily+Brown&background=9C27B0&color=fff',
      online: true
    },
    {
      id: '5',
      name: 'Michael Wilson',
      image: 'https://ui-avatars.com/api/?name=Michael+Wilson&background=3F51B5&color=fff',
      online: false
    },
    {
      id: '6',
      name: 'Jessica Taylor',
      image: 'https://ui-avatars.com/api/?name=Jessica+Taylor&background=FF9800&color=fff',
      online: true
    },
    {
      id: '7',
      name: 'Robert Martinez',
      image: 'https://ui-avatars.com/api/?name=Robert+Martinez&background=009688&color=fff',
      online: false
    },
    {
      id: '8',
      name: 'Amanda Thompson',
      image: 'https://ui-avatars.com/api/?name=Amanda+Thompson&background=795548&color=fff',
      online: true
    }
  ];

  // აქტიური ჩატის ფანჯრები - თავიდან ცარიელი (მხოლოდ მომხმარებლის ქმედებაზე გაიხსნება)
  const activeChats: {
    id: string;
    name: string;
    image: string;
    online: boolean;
    minimized: boolean;
  }[] = [];

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[360px] overflow-y-auto border-l border-border-color bg-sidebar-bg px-2 py-3 lg:block">
      {/* ქვედა ჩატის ფანჯრები */}
      <div className="fixed bottom-0 right-4 z-10 flex space-x-2">
        {activeChats.map((chat) => (
          <div 
            key={chat.id}
            className={`flex w-[328px] flex-col rounded-t-lg border border-border-color bg-card-bg shadow-sm ${chat.minimized ? 'h-12' : 'h-96'} overflow-hidden transition-all duration-200`}
          >
            {/* ჩატის ჰედერი */}
            <div className="flex h-12 items-center justify-between border-b border-border-color bg-card-secondary-bg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="relative h-8 w-8">
                  <Image 
                    src={chat.image}
                    alt={chat.name}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                  {chat.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card-secondary-bg bg-accent-green"></span>
                  )}
                </div>
                <span className="font-medium text-text-primary">{chat.name}</span>
              </div>
              
              <div className="flex items-center gap-1">
                {!chat.minimized && (
                  <>
                    <button className="rounded-full p-1 text-text-secondary transition-colors hover:bg-hover-bg hover:text-text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                        <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button className="rounded-full p-1 text-text-secondary transition-colors hover:bg-hover-bg hover:text-text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                        <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                      </svg>
                    </button>
                  </>
                )}
                <button className="rounded-full p-1 text-text-secondary transition-colors hover:bg-hover-bg hover:text-text-primary">
                  {chat.minimized ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.53 5.47a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72v5.69a.75.75 0 001.5 0v-5.69l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-.53 14.03a.75.75 0 001.06 0l3-3a.75.75 0 10-1.06-1.06l-1.72 1.72V8.25a.75.75 0 00-1.5 0v5.69l-1.72-1.72a.75.75 0 00-1.06 1.06l3 3z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <button className="rounded-full p-1 text-text-secondary transition-colors hover:bg-hover-bg hover:text-text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* ჩატის მთავარი ნაწილი */}
            {!chat.minimized && (
              <>
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="flex flex-col space-y-3">
                    <div className="max-w-[75%] self-start rounded-2xl bg-input-bg p-2 px-3 text-text-primary">
                      Hey there! How's it going?
                    </div>
                    <div className="max-w-[75%] self-end rounded-2xl bg-accent-blue p-2 px-3 text-white">
                      Pretty good, thanks for asking! Just working on the DapDip project.
                    </div>
                    <div className="max-w-[75%] self-start rounded-2xl bg-input-bg p-2 px-3 text-text-primary">
                      That's awesome! How's the progress so far?
                    </div>
                    <div className="max-w-[75%] self-end rounded-2xl bg-accent-blue p-2 px-3 text-white">
                      Making good progress! Just redesigning the UI to make it more modern.
                    </div>
                  </div>
                </div>
                
                {/* ჩატის ქვედა ნაწილი */}
                <div className="flex items-center border-t border-border-color bg-card-secondary-bg p-2">
                  <button className="rounded-full p-1 text-text-secondary transition-colors hover:bg-hover-bg hover:text-text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 00-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 01-.189-.866c0-.298.059-.605.189-.866zm2.023 6.828a.75.75 0 10-1.06-1.06 3.75 3.75 0 01-5.304 0 .75.75 0 00-1.06 1.06 5.25 5.25 0 007.424 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button className="rounded-full p-1 text-text-secondary transition-colors hover:bg-hover-bg hover:text-text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                      <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                      <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button className="rounded-full p-1 text-text-secondary transition-colors hover:bg-hover-bg hover:text-text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                      <path fillRule="evenodd" d="M4.5 3.75a3 3 0 00-3 3v10.5a3 3 0 003 3h15a3 3 0 003-3V6.75a3 3 0 00-3-3h-15zm9 4.5a.75.75 0 00-1.5 0v7.5a.75.75 0 001.5 0v-7.5zm1.5 0a.75.75 0 01.75-.75h3a.75.75 0 010 1.5H16.5v2.25H18a.75.75 0 010 1.5h-1.5v3a.75.75 0 01-1.5 0v-7.5zM6.636 9.78c.404-.575.867-.78 1.25-.78s.846.205 1.25.78a.75.75 0 001.228-.863C9.738 8.027 8.853 7.5 7.886 7.5c-.966 0-1.852.527-2.478 1.417-.62.882-.908 2-.908 3.083 0 1.083.288 2.201.909 3.083.625.89 1.51 1.417 2.477 1.417.967 0 1.852-.527 2.478-1.417a.75.75 0 00.136-.431V12a.75.75 0 00-.75-.75h-1.5a.75.75 0 000 1.5H9v1.648c-.37.44-.774.602-1.114.602-.383 0-.846-.205-1.25-.78C6.226 13.638 6 12.837 6 12c0-.837.226-1.638.636-2.22z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <input 
                    type="text" 
                    placeholder="Aa"
                    className="mx-2 flex-1 rounded-full bg-input-bg px-3 py-2 text-text-primary outline-none"
                  />
                  <button className="rounded-full p-1 text-accent-blue transition-colors hover:bg-hover-bg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* კონტაქტების სექცია */}
      <div className="contacts-section">
        <div className="mb-3 flex items-center justify-between px-2">
          <h2 className="text-lg font-bold text-text-primary">Contacts</h2>
          <div className="flex space-x-1">
            <button className="rounded-full p-1 text-text-secondary transition-colors hover:bg-hover-bg hover:text-text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                <path fillRule="evenodd" d="M4.5 4.5a3 3 0 013-3h9a3 3 0 013 3v4.5a3 3 0 01-3 3h-9a3 3 0 01-3-3V4.5zM4.5 15a3 3 0 013-3h9a3 3 0 013 3v4.5a3 3 0 01-3 3h-9a3 3 0 01-3-3V15zM13.5 6.75a.75.75 0 00-1.5 0V10.5a.75.75 0 001.5 0V6.75zM8.25 12.75a.75.75 0 00-1.5 0V16.5a.75.75 0 001.5 0V12.75z" clipRule="evenodd" />
              </svg>
            </button>
            <button className="rounded-full p-1 text-text-secondary transition-colors hover:bg-hover-bg hover:text-text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
              </svg>
            </button>
            <button className="rounded-full p-1 text-text-secondary transition-colors hover:bg-hover-bg hover:text-text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 8.625a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM15.375 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zM7.5 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* კონტაქტების სია */}
        <ul className="space-y-1">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-hover-bg">
                <div className="relative h-9 w-9">
                  <Image 
                    src={contact.image}
                    alt={contact.name}
                    width={36}
                    height={36}
                    className="rounded-full object-cover"
                  />
                  {contact.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-dark-bg bg-accent-green"></span>
                  )}
                </div>
                <span className="text-text-primary">{contact.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}