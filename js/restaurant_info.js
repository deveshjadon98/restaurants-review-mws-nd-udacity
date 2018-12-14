let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
  registerServiceWorker();
  const btnSubmitReview = document.querySelector('.btn-submit-review');
  btnSubmitReview.addEventListener('click', createReview);
  window.addEventListener('online', isOnline);
  window.addEventListener('offline', isOffline);
});

/**
 * Add review entered by user.
 */
const createReview = (event) => {
  const nameField = document.querySelector('.review-form-name');
  const ratingField = document.querySelector('.review-form-rating');
  const commentsField = document.querySelector('.review-form-comments');

  const nameValue = nameField.value;
  const ratingValue = ratingField.value;
  const commentsValue = commentsField.value;

  // if (nameValue == null || nameValue == '' || ratingValue == null || ratingValue == '' || commentsValue == null || commentsValue == '') {
  //   Toast.showToast('Please Fill Remaining Form Fields!');
  //   return;
  // }
  const date = new Date();

  const review = {
    "restaurant_id": self.restaurant.id,
    "name": nameValue,
    "rating": ratingValue,
    "comments": commentsValue,
    "createdAt": date.getTime(),
    "updatedAt": date.getTime()
  };

  const ul = document.getElementById('reviews-list');
  ul.appendChild(createReviewHTML(review));
  DBHelper.postReviewToDB(review);
  resetReviewForm(nameField, ratingField, commentsField);
};

/**
 * Reset review form.
 */
const resetReviewForm = (nameField, ratingField, commentsField) => {
  nameField.value = '';
  ratingField.value = '';
  commentsField.textContent = 'Enter Comments';
};

/**
 * Sync reviews with server.
 */
const syncReviewsWithServer = () => {
  Promise.all(reviewsToBeSynced.map(review => {
    DBHelper.createRestaurantReview(review);
  })).then(_ => {
    Toast.showToast('Background Sync For Reviews Has Been Completed Successfully!');
    reviewsToBeSynced.length = 0;
  }).catch(_ => {
    reviewsToBeSynced.length = 0;
  });
};

/**
 * Trigger notification when restaurant reviews page is online.
 */
const isOnline = (event) => {
  Toast.showToast('Application Is Now Online, Sync Will Continue.');
  syncReviewsWithServer();
};

/**
 * Trigger notification when restaurant reviews page is offline.
 */
const isOffline = (event) => {
  Toast.showToast('Application Is Offline, Your Data Has Been Saved For Background Sync.');
};

/**
 * Initialize leaflet map
 */
const initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoiZGV2ZXNoamFkb245OCIsImEiOiJjamo1Z2k1ODgxdGFlM3dzMnN3b3N0MnZpIn0.mLVuEsSgeyAZ3EmHt9TIKA',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}

/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.setAttribute('alt', 'Image of the inside of ' + restaurant.name + ' restaurant');

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');
    row.setAttribute('tabindex', '0');
    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');

  const reviewForm = document.querySelector('.review-input');
  const restaurantId = self.restaurant.id;
  DBHelper.fetchRestaurantReviewsById(restaurantId)
    .then(reviews => {
      if (!reviews || (reviews && reviews.length === 0)) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        container.insertBefore(noReviews, reviewForm);
        return;
      }
      const ul = document.getElementById('reviews-list');
      reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review));
      });
    })
    .catch(_ => {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.insertBefore(noReviews, reviewForm);
    });
}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.setAttribute('tabindex', '0');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.updatedAt);
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

const registerServiceWorker = () => {
  if (!navigator.serviceWorker) {
    return;
  }
  navigator.serviceWorker.register('../service-worker.js').then(() => {
    console.log('Service worker registered successfully!');
  }).catch((error) => {
    console.log('Error while registering service worker:', error);
  });
}