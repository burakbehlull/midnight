import mongoose from 'mongoose'

class Database {
	constructor(){
		this.mongoUri = process.env.MONGO_URI
	}
	connect(){
		const conn = mongoose.connect(this.mongoUri)
		.then(()=> console.log('Veritabanına bağlandı.'))
		.catch((err)=> console.error("Veritabanı hatası: ", err))
		
		return conn
	}
}

export default Database