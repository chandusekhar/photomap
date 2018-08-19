let html = {
    spinner: `<svg class="spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
                <circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
            </svg>`,
    spinner_small: `<svg class="spinner spinner-small" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
                <circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
            </svg>`,
    mdswitch: `<input type="checkbox" id="id-name--1" name="set-name" class="switch-input">
    <label for="id-name--1" class="switch-label">Switch <span class="toggle--on">On</span><span class="toggle--off">Off</span></label>`,
    dots: `<div class="ellipses">
    <span class="one">.</span><span class="two">.</span><span class="three">.</span>
  </div>`,
    placeholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
    loading: `<div class="loading">
    <svg class="spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
        <circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
    </svg>
</div>`,
    google: `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 48 48"><defs><path id="a" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></defs><clipPath id="b"><use xlink:href="#a" overflow="visible"/></clipPath><path clip-path="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z"/><path clip-path="url(#b)" fill="#EA4335" d="M0 11l17 13 7-6.1L48 14V0H0z"/><path clip-path="url(#b)" fill="#34A853" d="M0 37l30-23 7.9 1L48 0v48H0z"/><path clip-path="url(#b)" fill="#4285F4" d="M48 48L17 24l-4-3 35-10z"/></svg>`
}

const get = (p, o, r = null) =>
    p.reduce((xs, x) => (xs && xs[x]) ? xs[x] : r, o)

// Other constants
const MAX_GEOCODE_CONNECTIONS = 10

// Client ID and API key from the Developer Console
const API_KEY = 'AIzaSyBLjH1zVUY5zh3NM65NqRVP3eQxZy6ifcA';
const CLIENT_ID = '257316982603-0jmairn23vl079i1tt4tf0nk5kmkn32t.apps.googleusercontent.com';

// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.photos.readonly';

class Photo {
    constructor(photo) {
        this.id = photo.id
        this.url = photo.thumbnailLink

        if (photo.imageMediaMetadata)
            this.meta = photo.imageMediaMetadata
        else
            this.meta = {}
    }



    get camera() {
        let make = get(['cameraMake'], this.meta)
        let model = get(['cameraModel'], this.meta)

        if (!make || !model)
            return "None"

        return `${make.charAt(0).toUpperCase()}${make.substr(1)} ${model}`
    }

    get height() {
        return this.meta.height
    }

    get width() {
        return this.meta.width
    }

    get latitude() {
        return this.meta.location.latitude
    }

    get longitude() {
        return this.meta.location.longitude
    }

    get location() {
        let that = this
        return {
            latitude: that.latitude,
            longitude: that.longitude
        }
    }

    hasLocation() {
        return this.meta.location != undefined
    }

    /**
     * Update the remote with a new location for this photo
     * 
     * @param {Object.<location>} location // Contains a lat and long
     */
    setLocation(location) {

    }

    /**
     * Stub. Should return a street name
     */
    getFormattedAddress() {

    }

    /**
     * 
     * @param {int} width 
     * @param {int} height 
     */
    getSize(width, height) {
        if (!width) {
            width = this.width
            height = this.height
        } 
        
        if (height) {
            let base = this.url.substr(0, this.url.length - 4)
            return `${base}w${width}-h${height}-p-k-nu`
        } else {
            let base = this.url.substr(0, this.url.length - 3)
            return `${base}${width}`
        }
    }

    static resize(url, width) {
        let base = url.substr(0, url.length - 3)
        return `${base}${width}`
    }

}
class PhotoMap {
    constructor() {
        this.state = "unloaded"
        this.status = {
            drive: false,
            maps: false,
            photos: false
        }
        this.photos = []
        this.geocodeCount = 0
        this.markers = []
        this.infoWindows = []

        this.PAGE_SIZE = 1000
        this.MAX_PHOTOS = 4000
        this.RECURSE = true
        this.GEOCODE = false
        this.SIDEBAR = false

        this.ui = new UI(this)
    }

    get isFirstTime() {
        if (localStorage.getItem("isFirstTime") == "false")
            return false
        else
            return true
    }

    set isFirstTime(a) {
        localStorage.setItem("isFirstTime", a)
    }

    get loaded() {
        if (this.status.drive && this.status.maps)
            return true
        else
            return false
    }

    get maxPhotosReached() {
        return (this.photos.length >= this.MAX_PHOTOS)
    }

    set allPhotosLoaded(a) {
        // Callback for set
        this.status.photos = true

        this.ui.status = "loaded"
    }

    get allPhotosLoaded() {
        return this.status.photos
    }

    loadMap() {
        this.map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 0, lng: 0 },
            zoom: 2
        });


        this.map.addListener('zoom_changed', () => { photoMap.resetClusters(); })


        this.geocoder = new google.maps.Geocoder()

        var script = document.createElement('script');
        script.onload = function () {
            photoMap.status.maps = true
        };
        script.src = "dist/richmarker.js";

        document.head.appendChild(script);
    }

    async updateSidebarPlaces() {
        this.ui.emptyPlaces()

        for (let cluster of this.clusterer.clusters_) {
            if (!cluster.clusterIcon_.url_)
                continue

            this.ui.addPlace({
                lat: cluster.center_.lat(),
                long: cluster.center_.lng(),
                count: get(['clusterIcon_', 'sums_', 'text'], cluster),
                cover: Photo.resize(cluster.clusterIcon_.url_, 512)
            })
        }
    }

    clearMap() {
        for (let m of this.markers) {
            m.setMap(null);
        }

        this.markers.length = 0;
    }

    reset() {
        this.clearMap()
        this.photos.length = 0
    }

    /**
     * 
     * @param {Photo} photo 
     */
    processPhoto(photo) {
        this.photos.push(photo)

        $("#content-loading").remove()

        if (photo.hasLocation()) {
            if (this.SIDEBAR) {
                var c = document.createElement('div')
                c.className = "photo-list-item"
                c.id = photo.id
                c.innerHTML = `
                <div class="photo-container">
                    <img data-src="${photo.getSize(440)}">
                </div>
                <div class="photo-meta-container">
                    <div class="photo-meta-tags">
                        <!--<span class="photo-meta-tag-type"><i class="fas fa-question-circle"></i> Still</span>
                        <span class="photo-meta-tag-camera"><i class="fas fa-camera"></i> ${photo.camera}</span>
                        <span class="photo-meta-tag-resolution"><i class="fas fa-image"></i> ${photo.width} x ${photo.height}</span>-->
                    </div>
                    <div class="photo-meta-location-container">
                        <span class="fa-layers fa-fw">
                            <i class="fas fa-location-arrow"></i> 
                        </span> 
                    
                        <span class="photo-meta-location">${html.dots}</span>
                    </div>
                    
                </div>
            `
                this.photo_list[0].appendChild(c);

                //photo_list_item.append(...)
            }

            this.photoToMap(photo)

            // Bind listener to marker
            $(document).on('click', `.photo-list-item[data-id='${photo.id}']`, function () {
                let marker = photoMap.markers.filter(o => { return o.id == photo.id })[0]
                new google.maps.event.trigger(marker, 'click');
            })

            this.getLocation(photo)

        } else {
            /*photo_list_item.find(".photo-meta-location-container").html(`<span class="fa-layers fa-fw">
            <i class="fas fa-location-arrow"></i>
            <i class="fas fa-ban" data-fa-transform="grow-4" style="color:gray"></i>
        </span> `)*/
        }
    }

    photoToMap(photo) {
        let latLng = new google.maps.LatLng(photo.latitude,
            photo.longitude);


        let marker = new RichMarker({
            position: latLng,
            map: this.map,
            content: `<div><img style="height: 64px; border-radius: 5%; border: 4px solid white;" src="${photo.getSize(256)}"/></div>`,
            draggable: false,
            flat: true,
            anchor: RichMarkerPosition.TOP,
            cover: photo.getSize(128)
        })

        // Assign custom marker id
        marker.id = photo.id

        // Listen for click event
        marker.addListener('click', () => {
            if (photoMap.infoWindow)
                photoMap.infoWindow.close()

            photoMap.infoWindow = new google.maps.InfoWindow({
                content: `<a href="https://drive.google.com/file/d/${photo.id}/view" target="_blank"><img src="${photo.getSize()}"></a>`
            })

            photoMap.infoWindow.open(this.map, marker)

            if (photoMap.map.zoom < 20)
                photoMap.map.setZoom(21)
            photoMap.map.panTo(marker.position)
        })

        // Add to app marker array
        this.markers.push(marker)




    }

    /**
     * Called every time a view change is detected
     * or a new set of photos are added
     */
    resetClusters() {
        if (this.clusterer)
            this.clusterer.clearMarkers()

        this.clusterer = new MarkerClusterer(this.map, this.markers,
            {
                maxZoom: 21,
                minimumClusterSize: 2,
                cssClass: 'cluster'
            });
    }

    /**
     * Takes a photo and returns a string of the human readable
     * location.
     * @param {object} photo 
     */
    async getLocation(photo, isRetry = false) {
        const RETRY_WAIT_MS = 1000

        if (isRetry)
            await sleep(RETRY_WAIT_MS)

        //console.log(`Attempting to fetch location for ${photo.id}`)

        if (this.GEOCODE)
            this.executeGeocodeRequest(photo)
    }

    async executeGeocodeRequest(photo) {
        const BUSY_WAIT_MS = 1000

        while (this.geocodeCount >= MAX_GEOCODE_CONNECTIONS)
            await sleep(BUSY_WAIT_MS)

        this.geocodeCount++

        let latlng = { lat: photo.latitude, lng: photo.longitude };

        this.geocoder.geocode({ 'location': latlng }, function (results, status) {
            if (status === 'OK') {
                if (results[0]) {
                    photoMap.processGeocode(results[0], photo)
                } else {
                    console.log('No results found');
                }
            } else if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                photoMap.getLocation(photo, true)
                //console.log(`Retrying ${photo.id} in ${RETRY_WAIT_MS}ms due to query limit reached...`)
            } else {
                console.log('Geocoder failed due to: ' + status);
            }

            photoMap.geocodeCount--
        });

    }

    processGeocode(result, photo) {
        let formatted_address = result.formatted_address
        let country, region

        for (let c of result.address_components) {
            if (c.types.includes("country"))
                country = c.long_name
            else if (c.types.includes("locality") || c.types.includes("administrative_area_level_1"))
                region = c.long_name
        }

        if (country && region)
            formatted_address = `${country}, ${region}`

        console.log(`${photo.id} : ${formatted_address}`)

        $(`#${photo.id} > div.photo-meta-container > div.photo-meta-location-container > span.photo-meta-location`).html(formatted_address)

        photo.meta.location.address = formatted_address
    }

    async getPhotos(nextPageToken) {
        const DEFAULT_Q = 'mimeType contains "image/" and trashed=false'

        let q

        if (this.query)
            q = `fullText contains '${this.query}' and ${DEFAULT_Q}`
        else
            q = DEFAULT_Q

        await gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
        }).then(() => gapi.client.drive.files.list({
            'q': q,
            'spaces': 'photos, drive',
            'fields': "nextPageToken,files(id,imageMediaMetadata,thumbnailLink)",
            'pageToken': nextPageToken,
            pageSize: this.PAGE_SIZE
        })).then((response) => {
            if (response.result.error) {
                this.getPhotos(nextPageToken)
            } else if (this.photos.length >= this.MAX_PHOTOS) {
                console.log("Reached max photo count")
                this.allPhotosLoaded = true
            } else if (response.result.files) {
                this.addListOfPhotos(response.result)
            }
        })


    }

    addListOfPhotos(r) {
        for (let p of r.files)
            this.processPhoto(new Photo(p))

        // Update cluster
        this.resetClusters()

        // Update siderbar
        this.updateSidebarPlaces()

        if (r.nextPageToken && this.RECURSE) {
            this.getPhotos(r.nextPageToken)
            this.ui.statusMessage = `Fetched ${this.photos.length} photos...`
        } else if (!r.nextPageToken)
            this.allPhotosLoaded = true
    }
}
class UI {
    constructor(map) {
        this.photoMap = map

        this.html = {
            loading: `<div class="loading">
                        ${html.spinner_small} <span class="status">Fetching your Photos...</span>
                    </div>`,
            photoList: `<div class="photo-list"></div>`
        }

        this.selectors = {
            overlay: "#overlay",
            container: "#overlay .content",
            status: "#overlay .content .loading .status"
        }

        this.container = $(this.selectors.container)
        this.bindings()
        this.load()
    }

    set status(status) {
        this.status_ = status

        if (this.status_ == "loaded") {
            this.hideStatus()
        }
    }

    get status() {
        return this.status_
    }

    set statusMessage(message) {
        this.loadingMessage_ = message

        this.updateLoading()
    }

    bindings() {
        let that = this
        $(`${this.selectors.overlay} .close-icon`).on('click', function () {
            $(that.selectors.overlay).toggleClass("minimised")
            $(`.close-icon > svg`).toggleClass("fa-rotate-180")
        })
    }

    updateLoading(reset) {
        if (reset)
            this.container.html("")

        if (!this.loading)
            this.loading = $(this.html.loading).appendTo(this.container)

        $(this.selectors.status).html(this.loadingMessage_)
    }

    emptyPlaces() {
        this.photo_list.empty()
    }

    addPlace(place) {
        var c = document.createElement('div')
        c.className = "photo-list-item"
        c.innerHTML = `
                <div class="photo-container">
                    <img src="${place.cover}">
                </div>
                <div class="photo-meta-container">
                    <div class="photo-meta-tags">
                        <!--<span class="photo-meta-tag-type"><i class="fas fa-question-circle"></i> Still</span>-->
                        <span class="photo-meta-tag-camera"><i class="fas fa-camera"></i> </span>
                        <span class="photo-meta-tag-resolution"><i class="fas fa-image"></i> </span>
                    </div>
                    <div class="photo-meta-location-container">
                        <span class="fa-layers fa-fw">
                            <i class="fas fa-location-arrow"></i>
                        </span> 
                    
                        <span class="photo-meta-location"> </span>
                    </div>
                    
                </div>
            `
        this.photo_list[0].appendChild(c);
    }

    async load() {
        while (!this.photoMap.loaded) {
            await sleep(200)
        }

        this.photoMap.reset()

        this.statusMessage = "Fetching photos..."

        this.photo_list = $(this.html.photoList).appendTo(this.container);

        this.photoMap.getPhotos()
    }

    showSignIn() {
        this.container.append(`
        <div class="sign-in-container">
        <div class="sign-in-inner">
            <a class="button sign-in" href="#" onclick="signInHandler()">
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 48 48"><defs><path id="a" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></defs><clipPath id="b"><use xlink:href="#a" overflow="visible"/></clipPath><path clip-path="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z"/><path clip-path="url(#b)" fill="#EA4335" d="M0 11l17 13 7-6.1L48 14V0H0z"/><path clip-path="url(#b)" fill="#34A853" d="M0 37l30-23 7.9 1L48 0v48H0z"/><path clip-path="url(#b)" fill="#4285F4" d="M48 48L17 24l-4-3 35-10z"/></svg> Sign in with Google
            </a>

            <a class="privacy-policy" href="privacy.html" target="blank">Privacy Policy</a>
            </div>
            </div>
        `)
    }

    hideSignIn() {
        this.container.find(".sign-in-container").remove()
    }

    hideStatus() {
        this.loading.hide()
    }
}
async function loadMap() {
    photoMap.loadMap()
    console.log("Loaded Map")
}

async function signInHandler(authenticated=false) {
    photoMap.ui.hideSignIn();
    photoMap.ui.statusMessage = "Signing in..."

    await gapi.auth.authorize({
        'client_id': CLIENT_ID,
        'immediate': false,
        'scope': SCOPES
    });
    
    photoMap.status.drive = true

    photoMap.isFirstTime = false

    //console.log("Loaded API")
}

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}


function init() {
    if (!photoMap.isFirstTime) {
        signInHandler(true)
    } else {
        photoMap.ui.showSignIn()
    }
}

window.photoMap = new PhotoMap()
