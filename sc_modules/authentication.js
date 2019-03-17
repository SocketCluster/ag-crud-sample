module.exports.attach = function (agServer, socket) {
  let tokenExpiresInSeconds = 10 * 60;
  let tokenRenewalIntervalInMilliseconds = Math.round(1000 * tokenExpiresInSeconds / 3);

  // Keep renewing the token (if there is one) at a predefined interval to make sure that
  // it doesn't expire while the connection is active.
  let renewAuthTokenInterval = setInterval(function () {
    let currentToken = socket.authToken;
    if (currentToken) {
      currentToken.exp = Math.round(Date.now() / 1000) + tokenExpiresInSeconds;
      socket.setAuthToken(currentToken);
    }
  }, tokenRenewalIntervalInMilliseconds);

  (async () => {
    await socket.listener('disconnect').once();
    clearInterval(renewAuthTokenInterval);
  })();

  let validateLoginDetails = function (request) {
    let loginDetails = request.data;
    agServer.thinky.r.table('User').filter({username: loginDetails.username}).run(function (err, results) {
      if (results && results[0] && results[0].password === loginDetails.password) {
        let token = {
          username: loginDetails.username
        };
        socket.setAuthToken(token, {expiresIn: tokenExpiresInSeconds});
        request.end();
      } else {
        // Do not treat this as a fatal error. Just send back a message.
        request.end('Invalid username or password');
      }
    });
  };

  (async () => {
    for await (request of socket.procedure('login')) {
      validateLoginDetails(request);
    }
  })();
};
