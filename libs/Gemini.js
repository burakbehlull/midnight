import { GoogleGenerativeAI } from '@google/generative-ai';
import "dotenv/config"

export default class GeminiAI {
	
   constructor(){
	   this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
	   this.chatSessions = {}
   }
   
   async ask(channelId, messageContent) {
	  if (!this.chatSessions[channelId]) {
		const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
		this.chatSessions[channelId] = model.startChat({ history: [] });
	  }

	  try {
		const result = await this.chatSessions[channelId].sendMessage(messageContent);
		const response = await result.response;
		return response.text();
	  } catch (err) {
		console.error('Gemini API hatası:', err.message);

		if (err.message.includes('429')) {
		  await new Promise((r) => setTimeout(r, 25000));
		  try {
			const retry = await this.chatSessions[channelId].sendMessage(messageContent);
			return (await retry.response).text();
		  } catch (retryErr) {
			console.error('Retry de başarısız:', retryErr.message);
			return '❌ Gemini API kotasını aştınız. Lütfen sonra tekrar deneyin.';
		  }
		}

		return '❌ Gemini API cevap veremedi.';
	  }
	}

	
}