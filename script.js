const axios = require('axios');

const dataController = (function() {
     let propertyData = {};
    
    return {
        fetchAddress : async function(address) {
            const fetchResults = await axios({
                method: "GET",
                url: `https://search.onboard-apis.com/propertyapi/v1.0.0/sale/snapshot?address1=${address}&address2=${address}&radius=1&page=1&pagesize=1000`,
                headers: {
                    Accept: "application/json",
                    apikey: "2753098fce3aa650af94d135a4016d04"
                }
            })
    

            const results = fetchResults.data.property.filter(prop => {
                if (prop.building.rooms.beds > 0 && prop.sale.amount.saleamt > 0) {
                    return prop;
                }
            });
            
                propertyData.propResults = results;
                propertyData.propResults.forEach(prop => prop.image = Math.floor((Math.random() * 30) + 1));
        },

        fetchDetailedAddress : async function(address1, address2) {
            const fetchResults = await axios({
                method: "GET",
                url: `https://search.onboard-apis.com/propertyapi/v1.0.0/sale/detail?address1=${address1.replace("#", '')}&address2=${address2}`,
                headers: {
                    Accept: "application/json",
                    apikey: "2753098fce3aa650af94d135a4016d04"
                }
            });
            const results = fetchResults.data.property[0];
            propertyData.propDetail = results;
            const property = propertyData.propResults.find(el => el.identifier.obPropId === results.identifier.obPropId);
            propertyData.propDetail.image = property.image;
        },

        getPropObj : function() {
            return {
                propData : propertyData.propResults,
                propDetail : propertyData.propDetail,
                propLikes : propertyData.likes
            }
        },

        filterData : (price, beds, type) => {
            return propertyData.propResults.filter(item => {
                if (type === "all"){
                    return item.sale.amount.saleamt > parseInt(price) && item.building.rooms.beds > parseInt(beds);
                } else {
                    return item.sale.amount.saleamt > parseInt(price) && item.building.rooms.beds > parseInt(beds) && item.summary.proptype === type;
                }
            })
        },

        setLikes : () => {
            propertyData.likes = JSON.parse(localStorage.getItem("likes")) || [];
        },

        addLike : (property) => {
            const like = {
                id : property.identifier.obPropId,
                address1 : property.address.line1,
                address2 : property.address.line2,
                price : property.sale.amount.saleamt,
                bedrooms : property.building.rooms.beds,
                type : property.summary.proptype,
                image : property.image
            };
            propertyData.likes.push(like);
            localStorage.setItem("likes", JSON.stringify(propertyData.likes));
        },

        deleteLike : (property) => {
            index = propertyData.likes.findIndex(el => el.id === property.identifier.obPropId);
            propertyData.likes.splice(index, 1);
            localStorage.setItem("likes", JSON.stringify(propertyData.likes));
        },

        fetchLike : async (address1, address2) => {
            const fetchResults = await axios({
                method: "GET",
                url: `https://search.onboard-apis.com/propertyapi/v1.0.0/sale/detail?address1=${address1.replace("#", '')}&address2=${address2}`,
                headers: {
                    Accept: "application/json",
                    apikey: "2753098fce3aa650af94d135a4016d04"
                }
            });
            const results = fetchResults.data.property[0];
            propertyData.propDetail = results;
        }
    }
})();

const UIController = (function() {
    const DomSelectors = {
         heart : document.querySelector(".heart"),
         heartList : document.querySelector(".heart-list"),
         heartListUl : document.querySelector(".heart-list ul"),
         nav : document.querySelector(".main-nav ul"),
         mainContent : document.querySelector("#main-content"),
         listingPopup : document.querySelector("#listing-popup-container"),
         listingPopupWindow : document.querySelector(".listing-popup"),
         listingInfo : document.querySelector(".listing-info"),
         listingsContainer : document.querySelector("#listings-container"),
         listings : document.querySelector(".listings"),
         listingsItemContainer : document.querySelector(".listing-item-container"),
         listingItem : document.querySelector(".listing-item"),
         listingButtons : document.querySelector(".buttons"),
         closeListing : document.querySelector(".close"),
         listingSearch : document.querySelector(".secondary-nav input"),
         listingSearchForm : document.querySelector(".secondary-nav form"),
         priceButton : document.querySelector(".price-button"),
         bedButton : document.querySelector(".beds-button"),
         typeButton : document.querySelector(".type-button"),
         filterButtons : document.querySelectorAll(".filter"),
         listingsLoader : document.querySelector("#listloader"),
         mapLoader : document.querySelector("#map-container .map-overlay"),
         like : document.querySelector(".like"),
         listingToggle : document.querySelector(".toggle")
    }

    let map;
    let markersArr = [];
    let zipCode;

    const initMarkers = property => {
        let marker = new google.maps.Marker({
            position: new google.maps.LatLng(
                parseFloat(property.location.latitude),
                parseFloat(property.location.longitude)
            ),
            map: map,
            property: property
        });
    
        let infowindow = new google.maps.InfoWindow({
            content: `
            <p class="infoW">${property.address.line1}</p>
            <p class="infoW">${property.address.line2}</p>
            <p class="infoW">$${property.sale.amount.saleamt}</p>
            <span>${property.building.rooms.beds} BEDROOM ${
                property.summary.proptype.replace("SFR", "HOUSE").replace("CONDOMINIUM", "CONDO")
            }</span>
            `
        });
    
        marker.addListener("mouseover", function() {
            infowindow.open(map, marker);
        });

        marker.addListener("mouseout", function() {
            infowindow.close(map, marker)
        });
    
        marker.addListener("click", async function() {
            const property = this.property;
            const fetchResults = await axios({
                method: "GET",
                url: `https://search.onboard-apis.com/propertyapi/v1.0.0/sale/detail?address1=${property.address.line1.replace("#", '')}&address2=${property.address.line2}`,
                headers: {
                    Accept: "application/json",
                    apikey: "2753098fce3aa650af94d135a4016d04"
                }
            }).then(blob => {
                const prop = dataController.getPropObj().propData.find(el => el.identifier.obPropId === blob.data.property[0].identifier.obPropId);
                blob.data.property[0].image = prop.image;
                DomSelectors.listingInfo.innerHTML = popupHTML(blob.data.property[0]);
                DomSelectors.listingPopup.classList.add("listing-active");
                DomSelectors.listingPopupWindow.scrollTop = 0;
            });
        }); 
        markersArr.push([marker, infowindow]);
    }

    const popupHTML = (property) => {
        const like = dataController.getPropObj().propLikes.find(el => el.id === property.identifier.obPropId) || null;
        return `<figure>
            <img src="img/house${property.image}.jpg" alt="Listing">
        </figure>
        <h2><i class="fas fa-map-marker-alt"></i>${property.address.line1}<i class="${like !== null ? "fas" : "far"} fa-heart like"></i></h2>
        <h3>${property.address.line2}</h3>
        <h3>Price: $${property.sale.amount.saleamt}</h3>
        <hr>
        <div class="features-container">
        <h3>Features & Facts</h3>
        <div class="features">
            <div class="feature-item">
                <i class="fas fa-bed"></i>
                <div>
                    <h4>Beds: ${property.building.rooms.beds}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-bath"></i>
                <div>
                    <h4>Bath: ${property.building.rooms.bathstotal === 0 ? "Unknown" : property.building.rooms.bathstotal}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-ruler-combined"></i>
                <div>
                    <h4>Living Size: ${property.building.size.bldgsize === 0 ? "Unknown" : property.building.size.bldgsize}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-fire"></i>
                <div>
                    <h4>Heating: ${property.utilities.heatingtype === undefined ? "None" : property.utilities.heatingtype}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-snowflake"></i>
                <div>
                    <h4>Cooling: ${property.utilities.coolingtype === undefined ? "Type Unknown" : property.utilities.coolingtype}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-car"></i>
                <div>
                    <h4>Parking: ${property.building.parking.garagetype ? property.building.parking.garagetype : "No Garage"}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-home"></i>
                <div>
                    <h4>Type: ${property.summary.proptype === "SFR" ? "Single Family Residence" : property.summary.proptype}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-building"></i>
                <div>
                    <h4>Bldg Size: ${property.building.size.bldgsize === 0 ? "Unknown" : property.building.size.bldgsize}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-gavel"></i>
                <div>
                    <h4>Year built: ${property.summary.yearbuilt === 0 ? "Unknown" : property.summary.yearbuilt}</h4>
                </div>
            </div>

        </div>
        </div>
        <hr>
        <h3>More Information</h3>
        <ul>
            <li><span>Basement Size:</span> ${property.building.interior.bsmtsize === 0 ? "Unknown" : property.building.interior.bsmtsize}</li>
            <li><span>Construction Wall Type:</span> ${property.building.construction.wallType}</li>
            <li><span>Garage Size:</span> ${property.building.parking.prkgSize === 0 ? "Unknown" : property.building.parking.prkgSize}</li>
            <li><span>Floors</span>: ${property.building.summary.levels === 0 ? "Unknown" : property.building.summary.levels}</li>
            <li><span>Price per sqft:</span> ${property.sale.calculation.pricepersizeunit === 0 ? "Unknown" : "$" + property.sale.calculation.pricepersizeunit}</li>
        </ul>`
    };

        const createButton = (page, type) => {
            return `
            <button class="btn-inline btn-${type}" data-goto=${type === 'prev' ? page - 1 : page + 1}>
                <span>${type === 'prev' ? '<i class="fas fa-arrow-left"></i> ' : ""}Page ${type === 'prev' ? page - 1 : page + 1}${type === 'next' ? ' <i class="fas fa-arrow-right"></i>' : ""}</span>
            </button>
            `
        }

        const renderButtons = (page, numResults, resPerPage) => {
            //calculate how many pages
            const pages = Math.ceil(numResults / resPerPage);
            if (pages > 1){
                let button;
                if (page === 1 && pages > 1) {
                    //if first page and more than one page only show next button more
                    button = createButton(page, 'next');
                
                } else if (page < pages) {
                    //if inbetween show next and prev buttons
                    button = `
                        ${createButton(page, 'prev')}
                        ${createButton(page, 'next')}
                    `;
                }else if(page === pages && pages > 1){
                    //if last page and more than one page only show prev button
                    button = createButton(page, 'prev');
                }
                DomSelectors.listings.insertAdjacentHTML('beforeend', button);
            }
            
        }

        

    return {
        getDomSelectors : () => {
            return DomSelectors;
        },

        initMap : (data) => {
            map = new google.maps.Map(document.getElementById("map"), {
                center: {
                    lat: parseFloat(data[0].location.latitude),
                    lng: parseFloat(data[0].location.longitude)
                },
                zoom: 14
            });
            markersArr = [];
            data.forEach(property => initMarkers(property));
        },

        displayListings : (data, page = 1, resPerPage = 10, e) => {
            const start = (page - 1) * resPerPage;
            const end = page * resPerPage;
            const html = data.slice(start, end).map((property, i) => {
                 return `
                <div class="listing-item" data-property=${i} data-address1="${property.address.line1}" data-address2="${property.address.line2}" data-image=${property.image} data-id=${property.identifier.obPropId}
                style="background: url('img/house${property.image}.jpg') no-repeat center/cover" title="Click to view listing">
                <a href="#"></a>
                </div>`;
                
            }).join("");
            DomSelectors.listings.insertAdjacentHTML('afterbegin', `<div class="listing-items-container">${html}</div>`);
            renderButtons(page, data.length, resPerPage);
        },

        showPopup : (property) => {
            DomSelectors.listingPopup.classList.add("listing-active");
            DomSelectors.listingInfo.innerHTML = popupHTML(property);
        },
        
        showMarker : (e, markArr) => {
            if (!e.target.closest(".listing-item")) return;
            let index = e.target.parentNode.dataset.property;
            markArr[index][1].open(map, markArr[index][0]);
        },
        
        closeMarker : (e, markArr) => {
            if (!e.target.closest(".listing-item")) return;
            let index = e.target.parentNode.dataset.property;
            markArr[index][1].close(map, markArr[index][0]);
        },

        getMarkArr : () => {
            return markersArr;
        },

        findZipCode : () => {
            const autocomplete = new google.maps.places.Autocomplete(DomSelectors.listingSearch);
            autocomplete.addListener("place_changed", async function(){
                let details = this.getPlace();
                if(!details.address_components) return;
                zipCode = await details.address_components.filter(item => {
                    if(item["types"][0] === "postal_code"){
                        return item.long_name;
                    }
                })
            });
        },
        
        getZipCode : () => {
            return zipCode[0].long_name;
        },

        displayLikes : (likeArray) => {
            const html = likeArray.map(like => {
                return `<li data-address1='${like.address1}' data-address2='${like.address2}'  data-image='${like.image}'><a href="">
                <img src="img/house${like.image}.jpg" alt="Listing Item">
                <div>
                    <p>${like.address1}</p>
                    <p>${like.address2}</p>
                    <p>$${like.price}</p>
                    <p>${like.bedrooms} Bedroom ${like.type.replace("SFR", "House").replace("CONDOMINIUM", "Condo")}</p>
                </div>
            </a>
        </li>`
            }).join("");
            DomSelectors.heartListUl.innerHTML = html;
        }
}

})();

const controller = (function(dataCtrl, UICtrl) {
    
    let propData;
    let propDetail;
    let markArr;
    const url = new URL(window.location.href);
    const address = url.searchParams.get("address");
    if (!address) window.location.href = "index.html";
    const DOM = UICtrl.getDomSelectors();

    const setupEventListener = async function() {
        await window.addEventListener("load", onloadSetup);
        DOM.listings.addEventListener("click", (e) => propDetailSetup(e));
        DOM.listings.addEventListener("mouseover", (e) => UICtrl.showMarker(e, markArr));
        DOM.listings.addEventListener("mouseout", (e) => UICtrl.closeMarker(e, markArr));
        DOM.listingPopup.addEventListener("click", e => {
            if (e.path.includes(DOM.listingPopupWindow)) return;
            DOM.listingPopup.classList.remove("listing-active");
        });
        DOM.closeListing.addEventListener("click", () =>
            DOM.listingPopup.classList.remove("listing-active")
        );
        DOM.listingSearch.addEventListener("keyup", UICtrl.findZipCode);
        DOM.listingSearchForm.addEventListener("submit", listingAddressSearch);
        DOM.listingsContainer.addEventListener("click", pageResults);
        DOM.filterButtons.forEach(button => button.addEventListener("click", showFilterUL));
        DOM.filterButtons.forEach(button => button.addEventListener("click", filterButtonUpdate));
        DOM.heart.addEventListener("click", () => {DOM.heartList.classList.toggle("active")});
        window.addEventListener("click", e => {
            if(!e.target.closest(".heart")) DOM.heartList.classList.remove("active");
        });
        window.addEventListener("click", e => {
            if(!e.target.closest(".filter-btn")) {
                const filterUl = document.querySelectorAll(".filter ul");
                filterUl.forEach(button => {
                    button.classList.remove("filter-active");
                })
            };
        })
        DOM.listingInfo.addEventListener("click", handleLike);
        DOM.heartListUl.addEventListener("click", showLike);
        DOM.listingToggle.addEventListener("click", () => {
            DOM.mainContent.classList.toggle("active");
            if(DOM.mainContent.classList.contains("active")){
                DOM.listingToggle.classList.add("fa-sort-down");
                DOM.listingToggle.classList.remove("fa-sort-up");
            } else {
                DOM.listingToggle.classList.add("fa-sort-up");
                DOM.listingToggle.classList.remove("fa-sort-down");
            }
        })
    }

    const onloadSetup = async () => {
        // fetch data
        await dataCtrl.fetchAddress(address);

        //push data to propData var
        propData = dataCtrl.getPropObj().propData;

        // display map
        UICtrl.initMap(propData);

        //push data to markersArr
        markArr = UICtrl.getMarkArr();

        //loaders
        DOM.mapLoader.classList.remove("active");
        DOM.listingsLoader.classList.remove("active");

        //Set up likes array
        dataCtrl.setLikes();

        //get likes array
        propLikes = dataCtrl.getPropObj().propLikes;

        // display listings
        UICtrl.displayListings(propData);

        //display likes
        UICtrl.displayLikes(propLikes);
    }

    const propDetailSetup = async (e) => {
        e.preventDefault();
        //if the target does not have a href return
        if (!e.target.href) return;

        //get api parameters from data-address
        const address1 = e.target.parentNode.dataset.address1;
        const address2 = e.target.parentNode.dataset.address2;

        //fetch data
        await dataCtrl.fetchDetailedAddress(address1, address2);

        //push data to propDetail var
        propDetail = dataCtrl.getPropObj().propDetail;

        //show popup
        UICtrl.showPopup(propDetail);

        DOM.listingPopupWindow.scrollTop = 0;
    }

    const listingAddressSearch = async (e) => {
        e.preventDefault();
        //Loaders
        DOM.mapLoader.classList.add("active");
        DOM.listingsLoader.classList.add("active");

        //clear input
        DOM.listingSearchForm.reset();

        //get zip code from UI var
        let zip;
        try {
            zip = UICtrl.getZipCode();
        } catch(error){
            DOM.mapLoader.classList.remove("active");
            DOM.listingsLoader.classList.remove("active");
            alert("Please enter a valid address or zip code");
            return;
        }

        //clear list results
        DOM.listings.innerHTML = '';

        //get api data
        await dataCtrl.fetchAddress(zip);

        //push api data to propData var
        propData = dataCtrl.filterData(DOM.priceButton.dataset.value, DOM.bedButton.dataset.value, DOM.typeButton.dataset.value);

        // display map
        UICtrl.initMap(propData);

        //push data to markersArr
        markArr = UICtrl.getMarkArr();
        

        //loaders
        DOM.mapLoader.classList.remove("active");
        DOM.listingsLoader.classList.remove("active");

        // display listings
        UICtrl.displayListings(propData);
    }

    const filterData = () => {
        try {
        //get filtered data
        propData = dataCtrl.filterData(DOM.priceButton.dataset.value, DOM.bedButton.dataset.value, DOM.typeButton.dataset.value);

        //display map
        UICtrl.initMap(propData);

        //push data to markersArr
        markArr = UICtrl.getMarkArr();

        //clear list results
        DOM.listings.innerHTML = '';
 
        // display listings
        UICtrl.displayListings(propData);
        } catch(error){
            alert("There are no results for that search");
        }
    }

    const pageResults = e => {
        const btn = e.target.closest('.btn-inline');
        if(btn) {
            const goToPage = parseInt(btn.dataset.goto);
        
            DOM.listings.innerHTML = ''; 
            
            propData = dataCtrl.filterData(DOM.priceButton.dataset.value, DOM.bedButton.dataset.value, DOM.typeButton.dataset.value);

            UICtrl.displayListings(propData, goToPage);

            DOM.listingsContainer.scrollTop = 0;
        }
    }

    const showFilterUL = e => {
        if(!e.target.closest(".filter-btn")) return;
        const btn = e.target.closest(".filter-btn");
        const parent = btn.parentNode;
        const ul = parent.querySelector("ul");
        ul.classList.toggle("filter-active");
    }

    const filterButtonUpdate = e => {
        if(!e.target.closest("li")) return;
            const li = e.target.closest("li");
            const parent = li.parentNode.parentNode;
            const btn = parent.querySelector("button");
            btn.innerHTML = li.innerHTML + ' <i class="fas fa-caret-down"></i>';
            btn.dataset.value = li.dataset.value;
            li.parentNode.classList.toggle("filter-active");
            filterData();
    }

    const handleLike = (e) => {
        if(e.target.closest(".far.fa-heart")){
            const like = e.target.closest(".like");
            like.classList.remove("far");
            like.classList.add("fas");
            //get property
            const property = dataCtrl.getPropObj().propDetail;
    
            //add Like to likes array
            dataCtrl.addLike(property);
    
            //get likes array
            propLikes = dataCtrl.getPropObj().propLikes;
    
            //display likes
            UICtrl.displayLikes(propLikes);
        } else if(e.target.closest(".fas.fa-heart")){
            const like = e.target.closest(".like");
            like.classList.remove("fas");
            like.classList.add("far");
            //get property
            const property = dataCtrl.getPropObj().propDetail;

            //delete Like from likes array
            dataCtrl.deleteLike(property);

            //get likes array
            propLikes = dataCtrl.getPropObj().propLikes;

            //display likes
            UICtrl.displayLikes(propLikes);
        }
        
    }

    const showLike = async (e) => {
        e.preventDefault();
        const li = e.target.closest("li");
        
        //get api parameters from data-address
        const address1 = li.dataset.address1;
        const address2 = li.dataset.address2;

        //fetch data
        await dataCtrl.fetchLike(address1, address2);

        //push data to propDetail var
        propDetail = dataCtrl.getPropObj().propDetail;
        propDetail.image = li.dataset.image;

        //show popup
        UICtrl.showPopup(propDetail);

        DOM.listingPopupWindow.scrollTop = 0;
    }

  

    return {
       init : function() {
           setupEventListener();
       }
    }

})(dataController,UIController);

controller.init();


