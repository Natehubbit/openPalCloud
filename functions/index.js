const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp()


exports.onUSerMessageCreated = functions.database.ref('/Messages/{messageId}/{senderId}/{dataId}')
.onCreate(async (snapshot,context)=>{

    const { message,from,to } = snapshot._data

    if(from !== context.params.senderId) return

    console.log('Message Created')

    // GET SENDER DATA
    const senderPromise = admin.database().ref('/Users/'+from).once('value')
    // GET RECEIVER NOTIFICATION TOKEN
    const deviceTokenPromise = admin.database().ref(`/Tokens/${to}`).once('value')

    // RESOLVE PROMISES
    const results = await Promise.all([senderPromise, deviceTokenPromise])
    const sender = results[0].val()
    const notificationToken = results[1].val()

    const payload = {
        notification:{
            title: sender.name,
            body:message,
            icon:sender.image,
        }
    }

    const response = await admin.messaging().sendToDevice(notificationToken.token,payload)
    const {error} = response.results[0];
    if (error) {
        console.error('Failure sending notification to', notificationToken.token, error);
    }
})