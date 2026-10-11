You are an excellent full stack application developer.
I want to build an attractive and appealing HTML, CSS, JS landing page for my resume parser, where I should be able to upload an PDF and get the score out of it. Here I just want to see the score, what skills are present, and what skills are missing. And I'm gonna call this as 0 to shipped resume parser. This is gonna be a mock design, so just build html css is fine, no back-end server is needed. Include login and create account option in the application.
 
I want to convert this entire project into a react project
 
I want you to move this react project into frontend folder and build a backend folder that contains the express server to handle the request, lets connect to mongoDB.
 
The application should take resume PDF and a JD for comparison, AI part will be added later.

backend folder should container server.js, routes folder, controller folder, service folder, config folder, middleware folder and utils.js
 
Below is the format to connect to Coher api key ai, lets connect and parse the resume and give the score
 
quickstart
 
Send the conversation so far as messages, each a role (user or assistant) and its content, ending on the user's turn. cohere answers once, in JSON: message.content is the reply and credits.percentLeft is what is left of your allowance. Nothing is remembered between requests, so send the earlier turns yourself when you want a conversation.
 
const res = await fetch('https://api.cohere.ai/v2/chat', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'command-a-plus-05-2026',
    messages: [{ role: 'user', content: 'Explain closures in one paragraph.' }],
  }),
});
const data = await res.json();
console.log(data.message.content[0].text);
Keep the key on a server. cohere does not answer browsers on other sites, so a key in a web page is a key anyone viewing it can copy and nothing you can use.
401 the key is wrong or revoked · 402 the allowance is used up · 403 the API is switched off · 429 too many requests this minute, wait and retry.
Every answer spends the same allowance as labd in the portal, your editor and your terminal.