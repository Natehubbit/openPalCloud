const functions = require('firebase-functions');
const admin = require('firebase-admin');
const placeholder = "https://firebasestorage.googleapis.com/v0/b/openpal-1c7e8.appspot.com/o/Profile%20Images%2Fplaceholder.png?alt=media&token=f57e1392-5483-414a-9160-a0e774303e5c"
admin.initializeApp();


async function getUser(id){
    const userPromise = admin.database().ref('/Users/'+id).once('value')
    const userDetsResponse = await Promise.all([userPromise])
    const userDets = userDetsResponse[0].val()
    return userDets
}

async function getDeviceToken(id){
    const deviceTokenPromise = admin.database().ref(`/Tokens/${id}`).once('value')
    const deviceTokenResponse = await Promise.all([deviceTokenPromise]) 
    return deviceTokenResponse[0].val().token
}


exports.onUserMessageCreated = functions.database.ref('/Messages/{messageId}/{senderId}/{dataId}')
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
            icon:sender.image?sender.image:placeholder,
        }
    }

    const response = await admin.messaging().sendToDevice(notificationToken.token,payload)
    const {error} = response.results[0];
    if (error) {
        console.error('Failure sending notification to', notificationToken.token, error);
    }
})


exports.onGroupMessageCreated = functions.database.ref('/Groups/{groupId}/{messageId}')
.onCreate(async (snapshot,context)=>{
    
    if(context.params.groupId === 'g3n3ralgr0up1d') return

    const { message,from,to } = snapshot._data

    //GET ALL MEMBERS IN GROUP, GROUP NAME, SENDER NAME
    const groupDetailsPromise = admin.database().ref('/grou/'+to).once('value')
    const groupDetails = await Promise.all([groupDetailsPromise]);
    const {members, groupName, groupImage} = groupDetails[0].val()
    const sender = await getUser(from)

    const payload = {
        notification:{
            title:groupName,
            body: `${sender.name}: ${message}`,
            icon:groupImage?groupImage:placeholder,
        }
    }

    members.forEach(async (member)=>{
        if(member.uid !== from){
            const token = await getDeviceToken(member.uid)
            const response = await admin.messaging().sendToDevice(token,payload)
            const {error} = response.results[0];
            if (error) {
                console.error('Failure sending notification to', token, error);
            }
        }
    })
})

exports.onGeneralChatMessageCreated = functions.database.ref('/Groups/g3n3ralgr0up1d/{id}')
.onCreate(async (snapshot,context)=>{
    
    const { message,from} = snapshot._data

    const sender = await getUser(from)

    const payload = {
        notification:{
            title:'General Chat Group',
            body: `${sender.name}: ${message}`,
        }
    }

    let tokens = []

    admin.database().ref(`Tokens`).once('value',(snapshot)=>{
        snapshot.forEach(data=>{
            if(!(data.key === from)){
                tokens.push(data.val().token)
            }
        })
    })
    
    setTimeout(async() => {
        if(tokens.length>0){
            const response = await admin.messaging().sendToDevice(tokens,payload)
            const {error} = response.results[0];
            if (error) {
                console.error('Failure sending notification to', token, error);
            }else{
                console.log('Notification Sent')
            }
        }
    }, 500);
})

exports.onChatRequestSent = functions.database.ref('/Chat Requests/{userId}/{requestId}')
.onCreate(async (snapshot,context)=>{
    
    const receiverId = context.params.userId
    const sender = await getUser(context.params.requestId)
    const payload = {
        notification:{
            title:'Chat Request',
            body: `${sender.name} sent you a chat request`,
            // icon:groupImage?groupImage:placeholder,
        }
    }

    snapshot.forEach( async data=>{
        const reqType = data.val()
        if(reqType === 'received'){
            const token = await getDeviceToken(receiverId)
            const response = await admin.messaging().sendToDevice(token,payload)
            const {error} = response.results[0];
            if (error) {
                console.error('Failure sending notification to', token, error);
            }else{
                console.log('Notification Sent')
            }
        }
    })
})

exports.onJobPostCreated = functions.database.ref('/job postings/{postId}')
.onCreate(async (snapshot,context)=>{
    
    // console.log( 'data', snapshot._data)
    const { content } = snapshot._data

    const payload = {
        notification:{
            title:'New Job Posting',
            body: `${content}`,
        }
    }

    let tokens = []

    admin.database().ref(`Tokens`).once('value',(snapshot)=>{
        snapshot.forEach(data=>{
            // if(!(data.key === from)){
                tokens.push(data.val().token)
            // }
        })
    })
    
    setTimeout(async() => {
        if(tokens.length>0){
            const response = await admin.messaging().sendToDevice(tokens,payload)
            const {error} = response.results[0];
            if (error) {
                console.error('Failure sending notification to', token, error);
            }else{
                console.log('Notification Sent')
            }
        }
    }, 500);

})