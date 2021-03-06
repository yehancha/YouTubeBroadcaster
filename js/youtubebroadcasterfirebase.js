var YouTubeBroadcasterFirebase = function (onAuthCallback) {
    this.firebase = new Firebase("https://youtubebroadcaster.firebaseio.com/");
    this.videosRef = this.firebase.child("videos");
    this.submittersRef = this.firebase.child("submitters");
    this.videoLimit = 2;  // max number of videos one submitter can add
};

YouTubeBroadcasterFirebase.prototype.isLoggedIn = function () {
    return this.firebase.getAuth();
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
    this.videosRef.orderByPriority().on("value", callback, cancelCallback, this);
};

YouTubeBroadcasterFirebase.prototype.offVideoListChanged = function (callback) {
    this.videosRef.off("value", callback, this);
};

YouTubeBroadcasterFirebase.prototype.checkLimitAndAddVideo = function (videoId, failureCallback) {
    var auth = this.firebase.getAuth();
    var fullEmail = auth.password.email;
    // we exclude .com or .something part for username since . is not allowed in firebase
    var username = fullEmail.substring(0, fullEmail.indexOf("."));

    if (!username) {
        failureCallback("You are not logged in!");
    }
    
    var submitterRef = this.submittersRef.child(username);
    var context = this;
    submitterRef.once("value", function (submitterSnapshot) {
      var numberOfVideos = submitterSnapshot.numChildren();
      var submitterAtLimit = numberOfVideos >= context.videoLimit;
      if (!submitterAtLimit) {
        context.addVideo(videoId, username);
      } else {
        failureCallback("You are at limit!");
      }
    }, null, this);
};

YouTubeBroadcasterFirebase.prototype.addVideo = function (videoId, username) {
    var videoRef = this.videosRef.child(videoId);

    // priority is setting to the current time so it can be sorted by the added time
    var priority = new Date().getTime();
    var submittersRef = this.submittersRef;
    videoRef.transaction(function (currentData) {
        if (currentData === null) {
            var video = {
                submitter: username,
                rank: priority
            };
            return video;
        }
    }, function (error, commited, snapshot) {
        if (commited) {
            videoRef.setPriority(priority);

            var submitterVideoRef = submittersRef.child(username).child(videoId);
            submitterVideoRef.set(true);            
        }
    });  
}

YouTubeBroadcasterFirebase.prototype.removeVideo = function (videoId) {
    var videoRef = this.videosRef.child(videoId);

    // removing video from submitter list. Fist we get the username from video
    // ref and then use it to remove the ref at submitter list
    var videoSubmitterRef = videoRef.child("submitter");
    videoSubmitterRef.once("value", function (dataSnapshot) {
        var submitterUsername = dataSnapshot.val();
        var submitterVideoRef = this.submittersRef.child(submitterUsername).child(videoId);
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