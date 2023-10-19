import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { InsecureLogin } from '../insecure_login';

InsecureLogin.run();

if (Meteor.isFibersDisabled) {
  const userCount = await Meteor.users.find({ username: 'InsecureLogin' }).countAsync();
  if (!userCount) {
    await Accounts.createUserAsync({
      username: 'InsecureLogin',
      email: 'test@assert.com',
      password: 'password',
      profile: { name: 'InsecureLogin' },
    });
  }

  Accounts.registerLoginHandler(async function(options) {
    if (!options.username) return;
    const user = await Meteor.users.findOneAsync({ username: options.username });
    if (!user) return;
    return {
      userId: user._id,
    };
  }

)
} else {
  if (!Meteor.users.find({ username: 'InsecureLogin' }).count()) {
    Accounts.createUser({
      username: 'InsecureLogin',
      email: 'test@assert.com',
      password: 'password',
      profile: { name: 'InsecureLogin' },
    });
  }

  Accounts.registerLoginHandler(function(options) {
    if (!options.username) return;
    const user = Meteor.users.findOne({ username: options.username });
    if (!user) return;
    return {
      userId: user._id,
    };
  });
}

export {
  InsecureLogin,
};
