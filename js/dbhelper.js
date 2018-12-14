/**
 * Common database helper functions.
 */
let reviewsToBeSynced = [];

class Toast {
  static showToast(message) {
    const toast = document.querySelector('section.toast');

    toast.textContent = message;
    Toast.makeToastVisible(toast);

    setTimeout(() => {
      Toast.makeToastHidden(toast);
    }, 5000);
  }

  static makeToastVisible(toast) {
    toast.classList.add('show');
    toast.classList.remove('hide');
  }

  static makeToastHidden(toast) {
    toast.classList.remove('show');
    toast.classList.add('hide');
  }

}

class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static get DB_REVIEW_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/reviews`;
  }

  static setupIndexedDB() {
    return idb.open('restaurants-database', 2, function (db) {
      switch (db.oldVersion) {
        case 0:
          db.createObjectStore('restaurants');
        case 1:
          db.createObjectStore('reviews');
      }
    });
  }

  static saveRestaurantsToIndexedDB(restaurants) {
    return DBHelper.setupIndexedDB()
      .then(function (db) {
        if (!db) return;
        const transaction = db.transaction('restaurants', 'readwrite');
        const store = transaction.objectStore('restaurants');
        restaurants.forEach(function (restaurant) {
          store.put(restaurant, restaurant.id);
        });
        return transaction.complete;
      });
  }

  static fetchRestaurantsFromIndexedDB() {
    return DBHelper.setupIndexedDB()
      .then(function (db) {
        if (!db) return;
        const transaction = db.transaction('restaurants');
        const store = transaction.objectStore('restaurants');
        return store.getAll();
      });
  }
  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    DBHelper.fetchRestaurantsFromIndexedDB()
      .then(restaurants => {
        callback(null, restaurants);
      });
    fetch(DBHelper.DATABASE_URL)
      .then(result => result.json())
      .then(data => {
        DBHelper.saveRestaurantsToIndexedDB(data);
        callback(null, data);
      })
      .catch(data => {
        // callback(null, restaurants);
        // const error = (`Request failed. Returned status of ${data.status}`);
      })
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    fetch(`${DBHelper.DATABASE_URL}/${id}`)
      .then(result => result.json())
      .then(data => {
        callback(null, data);
      })
      .catch(data => {
        console.log('error', error);
      })
  }

  /**
   * Fetch restaurant reviews by its ID.
   */
  static fetchReviewsByRestaurantId(id, callback) {
    fetch(`${DBHelper.DB_REVIEW_URL}/?restaurant_id=${id}`)
      .then(result => result.json())
      .then(data => {
        callback(null, data);
      })
      .catch(data => {
        console.log('error', error);
      })
  }

  /**
   * Fetch restaurant reviews by its ID.
   */
  static createRestaurantReview(data, callback) {
    fetch(`${DBHelper.DB_REVIEW_URL}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(result => result.json())
      .then(data => {
        callback(null, data);
      })
      .catch(data => {
        console.log('error', error);
      })
  }

  /**
 * Fetch all reviews of a particular restaurant.
 */
  static fetchRestaurantReviewsById(restaurantId) {
    const reviewsUrl = `http://localhost:1337/reviews/?restaurant_id=${restaurantId}`;
    const dbPromise = DBHelper.setupIndexedDB();

    // Network then cache strategy - reviews.
    if (navigator.onLine) {
      return fetch(reviewsUrl)
        .then(response => response.json())
        .then(reviews => {
          if (!reviews || (reviews && reviews.length === 0)) throw new Error('Reviews not found');
          DBHelper.updateReviewsByRestaurantInDb(dbPromise, restaurantId, reviews);
          return reviews;
        }).catch(_ => {
          return DBHelper.getReviewsByRestaurantFromDb(dbPromise, restaurantId)
            .then(reviews => {
              if (reviews && reviews.length > 0) {
                // Fetched reviews from reviews IDB.
                return reviews;
              };
            });
        });
    } else {
      // Cache then network strategy - reviews.
      return DBHelper.getReviewsByRestaurantFromDb(dbPromise, restaurantId)
        .then(reviews => {
          if (reviews && reviews.length > 0) {
            // Fetched reviews from reviews IDB.
            return reviews;
          } else {
            // Fetch reviews from network.
            return fetch(reviewsUrl)
              .then(response => response.json())
              .then(reviews => {
                if (!reviews || (reviews && reviews.length === 0)) return;
                DBHelper.updateReviewsByRestaurantInDb(dbPromise, restaurantId, reviews);
                return reviews;
              });
          }
        }).catch((error) => {
          // Oops!. Got an error from server or some error while operations!
          console.log(`Request failed with error: ${error}`);
        });
    }

  }

  /**
   * Update IndexedDB with latest restaurant favorite before going online.
   */
  static updateFavoriteToDB(restaurant) {
    const dbPromise = DBHelper.setupIndexedDB();

    DBHelper.getRestaurantsFromDb(dbPromise)
      .then(restaurants => {
        if (!restaurants || (restaurants && restaurants.length === 0)) return;
        const updatedRestaurants = restaurants.map(restaurantFromDB => {
          if (restaurantFromDB.id == restaurant.restaurantId) {
            restaurantFromDB.is_favorite = restaurant.isFavorite;
          }
          return restaurantFromDB;
        });
        DBHelper.updateRestaurantsToDB(dbPromise, updatedRestaurants);

        if (navigator.onLine) {
          DBHelper.updateFavoriteToServer(restaurant);
        } else {
          restaurantsToBeSynced.push(restaurant);
        }
      });
  }

  /**
   * Update server with latest favorite.
   */
  static updateFavoriteToServer(restaurant) {
    const updateFavoriteUrl = `${DBHelper.DATABASE_URL}/${restaurant.restaurantId}/?is_favorite=${restaurant.isFavorite}`;

    return fetch(updateFavoriteUrl, {
      method: 'PUT'
    });
  }

  /**
   * Fetch restaurants from indexedDB.
   */
  static getRestaurantsFromDb(dbPromise) {
    return dbPromise.then((db) => {
      if (!db) return;
      let tx = db.transaction('restaurants');
      let restaurantsStore = tx.objectStore('restaurants');
      return restaurantsStore.getAll();
      // return restaurantsStore; 
    });
  }

  /**
   * Update restaurants to indexedDB.
   */
  static updateRestaurantsToDB(dbPromise, restaurants) {
    return dbPromise.then((db) => {
      if (!db) return;
      const tx = db.transaction('restaurants', 'readwrite');
      const restaurantsStore = tx.objectStore('restaurants');
      restaurants.forEach(function (restaurant) {
        restaurantsStore.put(restaurant, restaurant.id);
      });
      tx.complete;
    });
  }

  /**
   * Update IndexedDB with latest review before going online.
   */
  static postReviewToDB(review) {
    const dbPromise = DBHelper.setupIndexedDB();

    DBHelper.getReviewsByRestaurantFromDb(dbPromise, review.restaurant_id)
      .then(reviews => {
        if (!reviews)
          reviews = [];
        reviews.push(review);
        DBHelper.updateReviewsByRestaurantInDb(dbPromise, review.restaurant_id, reviews);

        if (navigator.onLine) {
          DBHelper.createRestaurantReview(review);
        } 
        else {
          reviewsToBeSynced.push(review);
        }

      });
  }
  /**
  * Update reviews to reviews db.
  */
  static updateReviewsByRestaurantInDb(dbPromise, restaurantId, reviews) {
    return dbPromise.then((db) => {
      if (!db) return;
      let tx = db.transaction('reviews', 'readwrite');
      let reviewsStore = tx.objectStore('reviews');
      reviewsStore.put(reviews, restaurantId);
      tx.complete;
    });
  }

  /**
   * Fetch reviews by restaurant ID using cache first or network first strategies with fallback.
   */
  static getReviewsByRestaurantFromDb(dbPromise, restaurantId) {
    return dbPromise.then((db) => {
      if (!db) return;
      let tx = db.transaction('reviews');
      let reviewsStore = tx.objectStore('reviews');
      return reviewsStore.get(restaurantId);
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      })
    marker.addTo(newMap);
    return marker;
  }
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

