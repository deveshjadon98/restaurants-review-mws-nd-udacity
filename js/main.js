let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
  registerServiceWorker();

  window.addEventListener('online', isOnline);
  window.addEventListener('offline', isOffline);
});

/**
 * Trigger notification when restaurant reviews page is online.
 */
const isOnline = (event) => {
  Toast.showToast('Application Is Now Online, Sync Will Continue.');
  syncFavoriteRestaurantsWithServer();
};

/**
 * Trigger notification when restaurant reviews page is offline.
 */
const isOffline = (event) => {
  Toast.showToast('Application Is Offline, Your Data Has Been Saved For Background Sync.');
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
const initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
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

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  li.setAttribute('tabindex','0');
  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.setAttribute('tabindex','0');
  image.setAttribute('alt', 'Image of the inside of '+restaurant.name+' restaurant');
  li.append(image);

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  name.setAttribute('tabindex','0');
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  neighborhood.setAttribute('tabindex','0');
  // li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  address.setAttribute('tabindex','0');
  // li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.setAttribute('role', 'button');
+ more.setAttribute('aria-label', 'view details of ' + restaurant.name + ' restaurant');
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  const favorite = document.createElement('span');
  favorite.className = 'card-action-favorite';
  favorite.dataset.id = restaurant.id;
  favorite.dataset.favorite = (restaurant.is_favorite == undefined || restaurant.is_favorite == 'undefined' || restaurant.is_favorite === false || restaurant.is_favorite === 'false') ? false : true;
  favorite.setAttribute('aria-label', `mark ${restaurant.name} restaurant as favorite`);
  if (favorite.dataset.favorite === 'true') {
    favorite.innerHTML = <i class="fas fa-heart"></i>;
  } else if (favorite.dataset.favorite === 'false') {
    favorite.innerHTML = <i class="fal fa-heart"></i>;
  }
  favorite.addEventListener('click', toggleFavoriteRestaurant);

  li.append(favorite);

  return li
}

/**
 * Toggle restaurant as favorite.
 */
const toggleFavoriteRestaurant = (event) => {
  const restaurantId = event.target.dataset.id;
  let isFavorite = event.target.dataset.favorite;

  if (isFavorite === 'false') {
    isFavorite = 'true';
    event.target.innerHTML = '&#10084;';
  } else if (isFavorite === 'true') {
    isFavorite = 'false';
    event.target.innerHTML = '&#9825;';
  }
  event.target.dataset.favorite = isFavorite;

  const restaurant = {
    restaurantId: restaurantId,
    isFavorite: isFavorite
  };
  DBHelper.updateFavoriteToDB(restaurant);
};

/**
 * Synce favorite restaurants with server.
 */
const syncFavoriteRestaurantsWithServer = () => {
  Promise.all(restaurantsToBeSynced.map(restaurant => {
    DBHelper.updateFavoriteToServer(restaurant);
  })).then(_ => {
    Toast.showToast('Background Sync For Favorites Has Been Completed Successfully!');
    restaurantsToBeSynced.length = 0;
  }).catch(_ => {
    restaurantsToBeSynced.length = 0;
  });
};

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

} 
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */

/*
 Provide the offline support to application by using service workers
*/
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

