var YouTubeBroadcasterFirebase = function (onAuthCallback) {
    this.firebase = new Firebase("https://youtubebroadcaster.firebaseio.com/");
};

YouTubeBroadcasterFirebase.prototype.isLoggedIn = function () {
    return this.firebase.getAuth();
};

YouTubeBroadcasterFirebase.prototype.getEmail = function() {
    var auth = this.firebase.getAuth();
    var fullEmail = auth.password.email;
    if (auth) {
        // we exclude .com or .something part since . is not allowed in firebase
        return fullEmail.substring(0, fullEmail.indexOf("."));
    } else {
        return null;
    }
};

YouTubeBroadcasterFirebase.prototype.onAuthChange = function (callback) {
    // Create a callback which logs the current auth state
    this.authDataCallback = function (authData) {
        if (authData) {
            console.log("User " + authData.uid + " is logged in with " + authData.provider);
        } else {
            console.log("User is logged out");
        }
        if (callback) {
            callback(authData);
        }
    };
    this.firebase.onAuth(this.authDataCallback);    
};

YouTubeBroadcasterFirebase.prototype.onVideoListChanged = function (callback, cancelCallback) {
    var videosRef = this.firebase.child("videos");
    videosRef.orderByPriority().on("value", callback, cancelCallback, this);
};

YouTubeBroadcasterFirebase.prototype.offVideoListChanged = function (callback) {
    var videosRef = this.firebase.child("videos");
    videosRef.off("value", callback, this);
};

YouTubeBroadcasterFirebase.prototype.addVideo = function (videoId, username) {
    var videoRef = this.firebase.child("videos").child(videoId);
    // priority is setting to the current time so it can be sorted by the added time
    var priority = new Date().getTime();
    var video = {
        submitter: username,
        rank: priority
    };
    videoRef.setWithPriority(video, priority);

    var submitterVideoRef = this.firebase.child("submitters").child(username).child(videoId);
    submitterVideoRef.set(true);
};

YouTubeBroadcasterFirebase.prototype.removeVideo = function (videoId) {
    var videoRef = this.firebase.child("videos").child(videoId);

    // removing video from submitter list. Fist we get the username from video
    // ref and then use it to remove the ref at submitter list
    var videoSubmitterRef = videoRef.child("submitter");
    videoSubmitterRef.once("value", function (dataSnapshot) {
        var submitterUsername = dataSnapshot.val();
        var submitterVideoRef = this.firebase.child("submitters").child(submitterUsername).child(videoId);
        submitterVideoRef.remove();
    },
            function (error) {

            },
            this); // YouTubeBroadcasterFirebase context

    // removing video from the videos list
    videoRef.remove();
};

YouTubeBroadcasterFirebase.prototype.login = function (email, password, callback) {
    this.firebase.authWithPassword({
        email: email + "",
        password: password
    }, function (error, authData) {
        if (error) {
            console.log("Login Failed!", error);
        } else {
            console.log("Authenticated successfully with payload:", authData);
        }
        if (callback) {
            callback(error, authData);
        }
    });
};

YouTubeBroadcasterFirebase.prototype.logout = function () {
    this.firebase.unauth();
};