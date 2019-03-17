module.exports.attach = async function (scServer, scCrudRethink) {
  /*
    Add some dummy data to RethinkDB;
  */

  let result;
  try {
    result = await scCrudRethink.read({
      type: 'User'
    });
  } catch (error) {
    console.error(err);
    return;
  }

  // If there is no User data, assume that we are starting with
  // an empty database.
  if (!result || !result.data || !result.data.length) {
    let schema = {
      Category: {
        foreignKeys: {
          products: 'Product'
        }
      }
    };

    let categories = {
      1: {
        name: 'Smartphones',
        desc: 'Handheld mobile devices'
      },
      2: {
        name: 'Tablets',
        desc: 'Mobile tablet devices'
      },
      3: {
        name: 'Desktops',
        desc: 'Desktop computers'
      },
      4: {
        name: 'Laptops',
        desc: 'Laptop computers'
      }
    };

    Object.keys(categories).forEach(function (id) {
      let obj = categories[id];
      scCrudRethink.create({
        type: 'Category',
        value: obj
      });
    });

    let users = {
      'alice': {
        username: 'alice',
        password: 'password123'
      }
    };

    Object.keys(users).forEach(function (id) {
      let obj = users[id];
      scCrudRethink.create({
        type: 'User',
        value: obj
      });
    });
  }
};
