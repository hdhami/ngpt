/* eslint-disable max-lines */

import moment from "moment";
import querystring from "querystring";
import intersection from "lodash.intersection";
import orderBy from "lodash.orderby";
import isequal from "lodash.isequal";
import get from "lodash.get";
import clonedeep from "lodash.clonedeep";
import union from "lodash.union";

import { observable, action, computed, configure } from "mobx";
import axios from "../utility/axios";
import { date, datediff, parseDate, covertToDateObject, formatDateString } from "../utility/dateUtils";
import {
    SELECT_RESORT,
    ROOM_LISTING,
    SELECT_DATE,
    RESORT_AND_DATE,
    PRICE_ASCENDING,
    PRICE_DESCENDING,
    PRICE_ASCENDING_AUTHORED,
    PRICE_DEFAULT,
    AVAILABLE,
    OFFER,
    NO_ARRIVAL,
    FREENIGHT,
    SOLD_OUT,
    URL_QUESTION_MARK,
    ERROR_MIN_NIGHT_ERROR,
    ERROR_TYPE_WARNING,
    INVALID_DATE
} from "../utility/constants";
import analytics from "./../utility/analytics";
import { generateCalendarData } from "./../utility/rateCalendarMap";
import { generateStaticCalendar, getMockCalendarData } from "./../utility/nonRateCalendarMap";
import * as sessionManager from "./../utility/sessionManager";
import getParameterByName from "./../utility/getParameterByName";
import getComponentRoutes from "./../utility/componentRoutes";
import { setItem, getItem } from "./../utility/sessionManager";
import loader from "./../utility/loader";
import {
    isCabana,
    isScaffoldingRefresh,
    isResortsAndDateView,
    getComponentData,
    getRoomServices,
    isEnableAllProperty,
    singlePropertyId,
    maxNoOfGuests,
    getCabanaBookingPhoneError,
    getNumAdults,
    isBookingRefresh,
    getCalendarMonths,
    getMaxTripDuration,
    getMemberConfig,
    isSignUpCtaEnabled,
    getMaxRooms,
    getRoomFilters,
    getMaxNights,
    bookableHotels,
    getCrossPropertyRooms,
    getDestination,
    getNumOffers,
    getURLs,
    getAccountSignInService,
    isNonPerpetual,
    refreshPricesOverlay,
    getMaxMonths
} from "../utility/MGMRIService";

configure({ enforceActions: "observed" });

const Map = window.Map;
const Map = 1234;
const services = getRoomServices();
const cabanaBookingPhoneError = getCabanaBookingPhoneError();
let maxGuests = maxNoOfGuests();
maxGuests ? (maxGuests = parseInt(maxGuests, 10)) : "";
const RoomListingComponent = getComponentData("RoomListing");
const defaultSortByPrice = get(RoomListingComponent, "componentData.defaultSortByPrice", "asc");
const isMultiCalanderTemplate = isEnableAllProperty() && isResortsAndDateView();

class BookingRoomStore {
    routes = [];

    urlList = {
        [SELECT_RESORT]: [
            "numGuests",
            "arrive",
            "depart",
            "programId",
            "selectedPropertyId",
            "selectedRegion",
            "bar",
            "po",
            "promoCode"
        ],
        [SELECT_DATE]: isEnableAllProperty()
            ? ["numGuests", "selectedPropertyId", "arrive", "depart", "programId", "bar", "po", "promoCode"]
            : ["numGuests", "arrive", "depart", "programId", "bar", "po", "promoCode"],
        [ROOM_LISTING]: [
            "arrive",
            "depart",
            "numGuests",
            "iataCode",
            "member",
            "programId",
            "promoCode",
            "roomTypeId",
            "price",
            "currency",
            "selectedRegion",
            "iataCode",
            "selectedPropertyId",
            "bar",
            "po",
            "promoCode"
        ],
        [RESORT_AND_DATE]: isEnableAllProperty()
            ? [
                  "selectedPropertyId",
                  "numGuests",
                  "arrive",
                  "depart",
                  "programId",
                  "bar",
                  "selectedRegion",
                  "po",
                  "promoCode"
              ]
            : ["numGuests", "arrive", "depart", "programId", "bar", "po", "promoCode"]
    };

    defaultFilters = new Map();

    @observable
    filters = new Map();

    @observable
    selectedFilters = new Map();

    globalfilters = new Map();

    propSpecificFilters = new Map();

    @observable
    prevParams = new Map();

    @observable
    roomTypeId = "";

    @observable
    roomTypeIds = [];

    @observable
    activeComponent = null;

    @observable
    responseErrors = null;

    @observable
    roomErrors = null;

    @observable
    promoCodeErrors = null;

    @observable
    globalWarnings = null;

    @observable
    showSignInModel = false;

    @observable
    location = null;

    @observable
    history = null;

    @observable
    viewport = "small";

    @observable
    propertyDetail = {};

    @observable
    roomList = {};

    @observable
    adaRooms = [];

    @observable
    rooms = [];

    @observable
    resorts = [];

    @observable
    selectedRooms = [];

    @observable
    selectedRoom = {};

    @observable
    tooManyFilters = false;

    @observable
    invalidTripDates = false;

    @observable
    totalNights = 1;

    @observable
    rateData = generateStaticCalendar();

    @observable
    sortByPrice = defaultSortByPrice === PRICE_ASCENDING_AUTHORED ? PRICE_ASCENDING : PRICE_DESCENDING;

    @observable
    resortSortOrder = PRICE_DEFAULT;

    @observable
    activeRegion = null;

    @observable
    showOffCanvas = false;

    @observable
    offerDetails = {};

    @observable
    offer = {};

    @observable
    segmentOffer = {};

    @observable
    isSegmentOffer = false;

    @observable
    isPromoCodeApplied = false;

    @observable
    isOfferApplied = false;

    @observable
    showFilterOffCanvas = false;

    @observable
    showRedesignFilterOffCanvas = false;

    @observable
    RoomOffersData = [];

    @observable
    showOfferCanvas = getItem("offerOffCanvas") === "1";

    @observable
    selectedPropertyName = null;

    @observable
    locationPropertyName = null;

    @observable
    isCabana = isCabana();

    @observable
    iataStatus = null;

    @observable
    resetCalendarDates = false;

    @observable
    validTravelDates = true;

    @observable
    crossPropertyData = {};

    @observable
    showCrossPropertyOffCanvas = false;

    @observable
    currentDateFlag = false;

    @observable
    cabanasBookingPhoneNumber = null;

    @observable
    isLoading = false;

    @observable
    updateNumGuest = false;

    @observable
    bookingRoomSeesion = {};

    @observable
    showErrorModal = false;

    previousRoute = null;

    @observable
    enableResortSorting = false;

    @observable
    resortErrors = null;

    reservationWindow = null;

    @observable
    crossPropertyError = null;

    @observable
    crossPropertyLoader = false;

    @observable
    overLayLoaderConfig = null;

    roomFilterOptions = [];

    @observable
    selectedRoomFilterTypes = [];

    @observable
    segmentOfferResorts = [];

    selectedFilters = new Map();

    @observable
    propertyCalendarMap = new Map();

    @observable
    resortPriceMap = new Map();

    @observable
    resortPriceErrorMap = new Map();

    @observable
    componentLoaderConfigMap = new Map();

    @observable
    isPerpetualOfferApplied = false;

    @observable
    activeCalendarMonthIndex = 0;

    @observable
    propertyOfferMap = new Map();

    minNightErrorObj = { code: ERROR_MIN_NIGHT_ERROR, type: ERROR_TYPE_WARNING };

    constructor() {
        this.routes = this.updateRoutesBasedOnTemplate();
        this.bookingRoomSeesion = sessionManager.getObject("booking-room") || {};
        this.editingRoom = sessionManager.getObject("editingRoom");
        this.editMode = this.editingRoom ? true : false;
        this.maxGuests = maxGuests;
        this.isScaffoldingRefresh = isScaffoldingRefresh();
        this.isResortsAndDateView = isResortsAndDateView();
        this.navigateToRoomListing = this.navigateToRoomListing.bind(this);
    }

    /**
     *  UpdateRoutes Based on Template.
     * */
    updateRoutesBasedOnTemplate() {
        let routes = getComponentRoutes();
        if (isEnableAllProperty() && isResortsAndDateView()) {
            routes = routes.filter(function(route) {
                return !(route.component === SELECT_RESORT || route.component === SELECT_DATE);
            });
        } else {
            routes = routes.filter(function(route) {
                return route.component !== RESORT_AND_DATE;
            });
        }

        return routes;
    }

    init(sessionStore, viewport) {
        this.sessionStore = sessionStore;
        this.viewport = viewport;
    }

    @computed
    get getOfferDetails() {
        const currentTemplateDefault =
            isEnableAllProperty() && isResortsAndDateView() ? RESORT_AND_DATE : SELECT_RESORT;

        if (
            this.segmentOffer &&
            this.segmentOffer.programDetailSSI &&
            this.activeComponent !== currentTemplateDefault
        ) {
            return this.segmentOffer.programDetailSSI;
        } else {
            return this.offer;
        }
    }

    @computed
    get getRoomErrors() {
        let error = this.roomErrors && this.roomErrors.length && this.roomErrors[0];
        if (
            error &&
            error.code === "_rooms_not_available" &&
            (this.filters.get("programId") || this.filters.get("promoCode"))
        ) {
            error = { type: "error", code: "_offer_not_available" };
        }

        return error;
    }

    @computed
    get getResortErrors() {
        return this.resortErrors && this.resortErrors.length && this.resortErrors[0];
    }

    @computed
    get getResponseErrors() {
        return this.responseErrors && this.responseErrors.length && this.responseErrors[0];
    }

    @computed
    get getPromoCodeErrors() {
        return this.promoCodeErrors && this.promoCodeErrors.length && this.promoCodeErrors[0];
    }

    @action
    resetResponseErrors() {
        this.responseErrors = null;
        this.promoCodeErrors = null;
    }

    @action
    updateOfferBestPriceWarning(val) {
        this.globalWarnings = val ? { code: "_no_offer_applied" } : null;
    }

    @action
    openCalendar() {}

    @action
    clearCalendarDates() {
        this.resetCalendarDates = false;
    }

    @action
    openErrorModal(errorCode) {
        this.showErrorModal = errorCode;
    }

    @action
    closeErrorModal() {
        this.showErrorModal = false;
    }

    getFilterValue(param, value) {
        const val = getParameterByName(param);

        return val || val == 0 ? val : value;
    }

    @action
    setActiveCalendarMonthIndex(index) {
        this.activeCalendarMonthIndex = this.activeCalendarMonthIndex + index;
    }

    @action
    resetActiveCalendarMonthIndex(index) {
        this.activeCalendarMonthIndex = 0;
    }

    @action
    setSelectResortDeepLinks() {
        this.validateAndSetNumGuests();
        if (!isScaffoldingRefresh() || (isScaffoldingRefresh() && isResortsAndDateView())) {
            this.validateAndSetTravelDates();
            this.validateAndSetSelectedPropertyId();
        }

        this.validateAndSetDefaultDeepLinks();
        this.filters = new Map([...this.defaultFilters, ...this.filters]);
    }

    @action
    setResortsAndDatesDeepLinks() {
        this.validateAndSetNumGuests();
        if (!isScaffoldingRefresh() || (isScaffoldingRefresh() && isResortsAndDateView())) {
            this.validateAndSetTravelDates();
            this.validateAndSetSelectedPropertyId();
        }

        this.validateAndSetDefaultDeepLinks();
        this.validateAndSetRoomFilters();
        this.filters = new Map([...this.defaultFilters, ...this.filters]);
        this.applyRoomFilterDeepLink();
    }

    @action
    setSelectDateDeepLinks() {
        this.validateAndSetNumGuests();
        this.validateAndSetSelectedPropertyId();
        this.validateAndSetDefaultDeepLinks();
        this.validateAndSetTravelDates();
        this.validateAndSetRoomFilters();
        this.filters = new Map([...this.defaultFilters, ...this.filters]);
        this.applyRoomFilterDeepLink();
    }

    @action
    setRoomListingDeepLinks() {
        this.validateAndSetNumGuests();
        this.validateAndSetSelectedPropertyId();
        this.validateAndSetDefaultDeepLinks();
        this.validateAndSetTravelDates();
        this.validateAndSetRoomFilters();
        this.filters = new Map([...this.defaultFilters, ...this.filters]);
        this.applyRoomFilterDeepLink();
    }

    getAllRoomFilterIds() {
        const roomFilterArr = getRoomFilters();

        let roomFilterIds = new Set();
        for (const propId in roomFilterArr) {
            const roomFilter = roomFilterArr[propId];

            roomFilter &&
                roomFilter.filter(item => {
                    if (item && item.id) {
                        roomFilterIds.add(item.id);
                    }
                });
        }

        roomFilterIds = [...roomFilterIds];
        const roomFilters =
            roomFilterIds &&
            roomFilterIds.map(item => {
                return { id: item };
            });

        return roomFilters;
    }

    validateAndSetRoomFilters() {
        let roomFilters = clonedeep(this.roomFilters);
        if (this.isResortsAndDateView) {
            roomFilters = this.getAllRoomFilterIds();
        }

        let filterQueryParams = new Map();
        roomFilters &&
            roomFilters.map(item => {
                if (item.id) {
                    let queryValue = this.getFilterValue(item.id, "");
                    if (queryValue) {
                        filterQueryParams.set(item.id, queryValue);
                    }
                }
            });
        if (this.isResortsAndDateView) {
            this.selectedFilters = new Map([...this.selectedFilters, ...filterQueryParams]);
        } else {
            this.selectedFilters = filterQueryParams;
        }
    }

    validateAndSetNumGuests() {
        const numAdults = this.getFilterValue("numGuests", getNumAdults());
        const maxGuestsCount = this.isCabana ? this.maxGuests + "+" : this.maxGuests;

        if (isNaN(numAdults) || numAdults < 1) {
            this.defaultFilters.set("numAdults", getNumAdults());
            this.defaultFilters.set("numGuests", getNumAdults());
        } else if (numAdults > this.maxGuests) {
            this.defaultFilters.set("numAdults", maxGuestsCount);
            this.defaultFilters.set("numGuests", maxGuestsCount);
        } else {
            this.defaultFilters.set("numAdults", numAdults);
            this.defaultFilters.set("numGuests", numAdults);
        }
    }

    validateAndSetSelectedPropertyId() {
        const selectedPropertyId = this.defaultFilters.get("selectedPropertyId") || "";

        this.defaultFilters.set("selectedPropertyId", this.getFilterValue("selectedPropertyId", selectedPropertyId));
        this.filters.set("selectedPropertyId", this.getFilterValue("selectedPropertyId", selectedPropertyId));
    }

    validateAndSetTravelDates() {
        const arrive = this.getFilterValue("arrive", this.defaultFilters.get("arrive"));
        const depart = this.getFilterValue("depart", this.defaultFilters.get("depart"));
        const stayLength = this.getFilterValue("stayLength", false);
        const arriveFormat = moment(arrive).format("L");
        const strArrive = moment(arriveFormat)
            .utc()
            .valueOf();
        const departFormat = moment(depart).format("L");
        const strDepart = moment(departFormat)
            .utc()
            .valueOf();
        const stayFlag = (arrive && stayLength) || false;
        const todayFormat = moment(new Date()).format("L");
        const today = moment(todayFormat)
            .utc()
            .valueOf();

        if (
            (arrive && new Date(arrive) == "Invalid Date") ||
            (depart && new Date(depart) == "Invalid Date") ||
            strArrive < today ||
            (depart && strArrive >= strDepart)
        ) {
            this.defaultFilters.set("arrive", "");
            this.defaultFilters.set("depart", "");
        } else if (stayLength) {
            stayFlag && this.setArriveDepartByStayLength(arrive, stayLength);
        } else {
            this.defaultFilters.set("arrive", arrive);
            this.defaultFilters.set("depart", depart);
        }
    }

    validateAndSetDefaultDeepLinks() {
        const selectedRoomId = this.getFilterValue("roomTypeId", "");
        const selectedRegion = this.getFilterValue("selectedRegion", false);
        const priceTypeValue = this.getFilterValue("price", false);

        this.defaultFilters.set("propertyId", this.getFilterValue("propertyId", singlePropertyId()));
        this.defaultFilters.set("promoCode", this.getFilterValue("promoCode", ""));
        this.defaultFilters.set("programId", this.getFilterValue("programId", ""));
        this.defaultFilters.set("iataCode", this.getFilterValue("iataCode", ""));
        this.defaultFilters.set("bar", this.getFilterValue("bar", ""));
        this.defaultFilters.set("bookingRefresh", this.getFilterValue("bookingRefresh", isBookingRefresh()));
        this.defaultFilters.set("stayLength", this.getFilterValue("stayLength", ""));
        this.defaultFilters.set("maxTripDuration", this.getFilterValue("stayLength", getMaxTripDuration()));
        this.defaultFilters.set("totalCalendarMonths", this.getFilterValue("totalCalendarMonths", getCalendarMonths()));
        this.defaultFilters.set("memberPricing", this.getFilterValue("memberPricing", getMemberConfig()));
        this.defaultFilters.set("signUpCtaEnabled", this.getFilterValue("signUpCtaEnabled", isSignUpCtaEnabled()));
        this.defaultFilters.set("po", this.getFilterValue("po", ""));
        if (selectedRoomId) {
            this.defaultFilters.set("selectedRoomId", selectedRoomId);
            this.defaultFilters.set("roomTypeId", selectedRoomId);
        }

        if (selectedRegion) {
            this.defaultFilters.set("selectedRegion", selectedRegion);
        }

        if (priceTypeValue) {
            this.defaultFilters.set("urlPriceType", priceTypeValue);
        }
    }

    setArriveDepart() {
        this.defaultFilters.set("arrive", date({ date: new Date() }));
        this.defaultFilters.set("depart", date({ date: new Date(), addDays: 1 }));
    }

    setArrive() {
        this.defaultFilters.set("arrive", date({ date: new Date() }));
    }

    setArriveDepartByStayLength(arrive = null, stayLength = 1) {
        this.defaultFilters.set("arrive", date({ date: arrive ? new Date(arrive + " 00:00:00") : new Date() }));
        this.defaultFilters.set(
            "depart",
            date({ date: arrive ? new Date(arrive + " 00:00:00") : new Date(), addDays: parseInt(stayLength, 10) })
        );
    }

    setArriveDepartbyDate(val) {
        this.defaultFilters.set("arrive", date({ date: new Date(val) }));
        this.defaultFilters.set("depart", date({ date: new Date(val), addDays: 1 }));
    }

    @action
    parseQueryParams(params = {}) {
        const filters = new Map([...this.defaultFilters, ...this.filters]);
        const arrive = parseDate(filters.get("arrive"), "y-m-d", "m/d/y");
        const depart = parseDate(filters.get("depart"), "y-m-d", "m/d/y");
        let numAdults = !isNaN(filters.get("numAdults")) ? parseInt(filters.get("numAdults"), 10) : getNumAdults();
        numAdults = numAdults > this.maxGuests ? this.maxGuests : numAdults;
        const bestAvailable = this.filters.get("po") ? true : false;
        const defaults = {
            checkInDate: arrive,
            checkOutDate: depart,
            numAdults,
            bookingRefresh: filters.get("bookingRefresh"),
            signUpCtaEnabled: filters.get("signUpCtaEnabled"),
            memberPricing: filters.get("memberPricing"),
            propertyId: filters.get("propertyId"),
            selectedPropertyId: isEnableAllProperty() ? filters.get("selectedPropertyId") : singlePropertyId()
        };

        if (bestAvailable) {
            defaults.bestAvailable = bestAvailable;
        }

        if (this.isCabana && arrive && arrive.length > 0) {
            const dd = covertToDateObject(filters.get("arrive"), "y-m-d");

            defaults.checkOutDate = parseDate(date({ date: dd, addDays: 1 }), "y-m-d", "m/d/y");
        }

        if (this.isCabana && arrive && arrive.length > 0) {
            const dd = covertToDateObject(filters.get("arrive"), "y-m-d");

            defaults.checkOutDate = parseDate(date({ date: dd, addDays: 1 }), "y-m-d", "m/d/y");
        }

        return Object.assign(defaults, params);
    }

    getMergedRateResponse(origResp, patchResp) {
        const origResponse = clonedeep(origResp);
        const patchCalendarData = patchResp.calendar || [];
        const originnalCalData = origResponse.calendar || [];
        const patchRespFirstElement = patchCalendarData[0];
        const patchDataLen = patchCalendarData.length;

        if (patchDataLen) {
            const firstMatchingIndex = originnalCalData.findIndex(day => {
                return day.date == patchRespFirstElement.date;
            });

            for (let i = 0; i < patchDataLen; i += 1) {
                originnalCalData[firstMatchingIndex + i] = patchCalendarData[i];
            }
        }

        return origResponse;
    }

    @action
    resetRateResponseToDefaultPricing() {
        const { req, resp } = this.rateResponseWithoutTripPricing;
        const calendarData = generateCalendarData(resp.calendar, req.calendarStartDate);

        this.rateData = calendarData.formattedData;
    }

    @action
    getResortPrice(filters = {}, data = {}) {
        const serviceUrl = services["resortPrice"];
        let defaults = {
                maximumNumberOfReservations: getMaxRooms(),
                maxTripDuration: this.filters.get("maxTripDuration"),
                partialOffer: false
            },
            prevPromoCode = this.filters.get("prevPromoCode"),
            promoCode = this.filters.get("promoCode"),
            prevProgramId = this.filters.get("prevProgramId") || "",
            programId = this.filters.get("programId") || "",
            bar = this.filters.get("bar"),
            urlPriceType = this.filters.get("urlPriceType"),
            partialOffer = this.filters.get("partialOffer"),
            iataCode = this.filters.get("iataCode");
        partialOffer ? (defaults.partialOffer = partialOffer) : null;
        promoCode ? (defaults.promoCode = promoCode) : null;
        defaults.programId = programId;
        defaults.prevProgramId = prevProgramId;

        if (prevPromoCode) {
            defaults.prevPromoCode = prevPromoCode;
        }

        if (this.editMode) {
            defaults.flow = "edit";
        }

        if (bar) {
            defaults.bar = bar;
        }

        if (iataCode) {
            defaults.agentId = iataCode;
        }

        if (isNonPerpetual()) {
            defaults.nonPerpetual = true;
        }

        if (this.roomTypeId) {
            defaults.roomTypeId = this.roomTypeId;
        }

        urlPriceType ? (defaults.urlPriceType = urlPriceType) : "";

        defaults.programId = this.validateProgramId(defaults.programId, data);

        filters = Object.assign(defaults, filters);

        const params = this.parseQueryParams(filters);

        this.dataRequest(
            serviceUrl,
            {
                id: `resortPrice_${data.propertyId}`,
                params,
                loadAnim: false,
                enableComponentLoaderOverLay: data.enableComponentLoaderOverLay
                    ? data.enableComponentLoaderOverLay
                    : false,
                disableScrollToTop: data.disableScrollToTop,
                disableGlobalError: true
            },
            (response, errors) => {
                if (response && response.room) {
                    this.resortPriceMap.set(`${data.propertyId}`, response.room);
                    this.resortPriceErrorMap.delete(`${data.propertyId}`);
                } else if (errors) {
                    this.resortPriceErrorMap.set(`${data.propertyId}`, errors[0]);
                    this.resortPriceMap.delete(`${data.propertyId}`);
                }
            }
        );
    }

    @action
    getResortCalendar(filters = {}, data = {}, callback) {
        const serviceUrl = services["calendar"];
        let defaults = {
                calendarStartDate: "",
                calendarEndDate: "",
                maxTripDuration: this.filters.get("maxTripDuration"),
                tripPricing: false
            },
            promoCode = this.filters.get("promoCode"),
            programId = this.filters.get("programId");
        defaults.totalCalendarMonths = this.filters.get("totalCalendarMonths");
        defaults.prevProgramId = this.filters.get("prevProgramId");
        promoCode ? (defaults.promoCode = promoCode) : null;
        programId ? (defaults.programId = programId) : null;

        if (this.editMode) {
            defaults.flow = "edit";
        }

        if (this.roomTypeId) {
            defaults.roomTypeId = this.roomTypeId;
        }

        if (isNonPerpetual()) {
            defaults.nonPerpetual = true;
        }

        let params = filters
            ? this.parseQueryParams(Object.assign(defaults, filters))
            : this.parseQueryParams(defaults);

        this.resetCalendarDates = true;

        if (data.clearArriveDepart) {
            this.clearArriveDepart();
        }

        this.dataRequest(
            serviceUrl,
            {
                id: `calendar_${data.propertyId}`,
                params,
                loadAnim: data.enableLoaderOverlay ? false : true,
                enableLoaderOverlay: data.enableLoaderOverlay ? data.enableLoaderOverlay : false,
                ignoreParams: data.noIgnore ? [] : ["checkInDate", "checkOutDate", "tripPricing"],
                onComplete: (req, res, err) => {
                    data.onComplete && data.onComplete(req, res, err);
                },
                disableScrollToTop: true,
                serviceReqBlockedCallback: data.serviceReqBlockedCallback
            },
            (resp, errors, req) => {
                let response = resp;
                let request = req;
                let calendarData = response.calendar;

                if (!filters.tripPricing) {
                    this[`rateResponseWithoutTripPricing_${data.propertyId}`] = {
                        resp,
                        errors,
                        req
                    };
                } else {
                    response = this.getMergedRateResponse(
                        this[`rateResponseWithoutTripPricing_${data.propertyId}`].resp,
                        resp
                    );
                    request = this[`rateResponseWithoutTripPricing_${data.propertyId}`].req;
                }

                if (this.isResortsAndDateView && calendarData && !calendarData[0]) {
                    const utcDate = new Date().toUTCString();
                    const maxMonths = getMaxMonths() + 1;
                    const mockedCalendarData = getMockCalendarData(utcDate, maxMonths);

                    calendarData = generateCalendarData(mockedCalendarData, request.calendarStartDate);
                } else {
                    calendarData = generateCalendarData(response.calendar, request.calendarStartDate);
                }

                this.propertyCalendarMap.set(`${data.propertyId}`, calendarData.formattedData);

                if (resp.offer) {
                    this.offerDetails = resp.offer || {};
                    this.propertyOfferMap.set(data.propertyId, resp.offer);
                }

                if (callback) {
                    callback(response, errors);
                }
            }
        );
    }

    @action
    showMinErrorMessage(val, propertyId) {
        if (val) {
            this.resortPriceErrorMap.set(propertyId, this.minNightErrorObj);
        }
    }

    @action
    rateCalendarData(filters = {}, data = {}, callback) {
        const serviceUrl = services["calendar"];
        const _this = this;
        let defaults = {
                calendarStartDate: "",
                calendarEndDate: "",
                maxTripDuration: this.filters.get("maxTripDuration"),
                tripPricing: false
            },
            promoCode = this.filters.get("promoCode"),
            programId = this.filters.get("programId");
        defaults.totalCalendarMonths = this.filters.get("totalCalendarMonths");
        defaults.prevProgramId = this.filters.get("prevProgramId");
        promoCode ? (defaults.promoCode = promoCode) : null;
        programId ? (defaults.programId = programId) : null;

        if (this.editMode) {
            defaults.flow = "edit";
        }

        if (this.roomTypeId) {
            defaults.roomTypeId = this.roomTypeId;
        }

        if (isNonPerpetual()) {
            defaults.nonPerpetual = true;
        }

        let params = filters
            ? this.parseQueryParams(Object.assign(defaults, filters))
            : this.parseQueryParams(defaults);

        this.resetCalendarDates = true;
        _this.responseErrors = "";

        if (data.clearArriveDepart) {
            this.clearArriveDepart();
        }

        this.dataRequest(
            serviceUrl,
            {
                id: "calendar",
                params,
                loadAnim: data.enableLoaderOverlay ? false : true,
                enableLoaderOverlay: data.enableLoaderOverlay ? data.enableLoaderOverlay : false,
                ignoreParams: data.noIgnore ? [] : ["checkInDate", "checkOutDate", "tripPricing"],
                onComplete: (req, res, err) => {
                    data.onComplete && data.onComplete(req, res, err);
                },
                disableScrollToTop: data.disableScrollToTop,
                serviceReqBlockedCallback: data.serviceReqBlockedCallback
            },
            (resp, errors, req) => {
                let response = resp;
                let request = req;
                if (!filters.tripPricing) {
                    _this.rateResponseWithoutTripPricing = {
                        resp,
                        errors,
                        req
                    };
                } else {
                    response = this.getMergedRateResponse(_this.rateResponseWithoutTripPricing.resp, resp);
                    request = _this.rateResponseWithoutTripPricing.req;
                }

                const calendarData = generateCalendarData(response.calendar, request.calendarStartDate);

                _this.rateData = calendarData.formattedData;
                _this.isPerpetualOfferApplied = (response.offer && response.offer.isPerpetualOffer) || false;
                _this.offerDetails = response.offer || {};
                _this.offer = response.offer || {};
                _this.segmentOffer = {};
                _this.isOfferApplied = response.offer ? true : false;
                if (
                    response.offer &&
                    response.offer.isPerpetualOffer &&
                    response.offer.programId &&
                    !isNonPerpetual()
                ) {
                    this.filters.set("programId", response.offer.programId);
                    this.history.push(URL_QUESTION_MARK + this.searchUrl);
                }

                if (response.offer && response.offer.offerType == "segment") {
                    const programId = _this.filters.get("programId");
                    const selectedPropertyId = _this.filters.get("selectedPropertyId");

                    _this.isSegmentOffer = true;
                    _this.segmentOffer = response.resorts.find(item => {
                        return item.programId == programId;
                    });
                    if (!_this.segmentOffer && isEnableAllProperty()) {
                        _this.segmentOffer = response.resorts.find(item => {
                            return (
                                programId &&
                                item.segmentId == programId &&
                                (selectedPropertyId ? item.propertyId == selectedPropertyId : true)
                            );
                        });
                    }
                } else {
                    _this.isSegmentOffer = false;
                }

                if (isEnableAllProperty()) {
                    _this.setActiveRegion(this.activeRegion);
                    const selectedPropObj = response.resorts.find(
                        val => val.propertyDetail.id === _this.filters.get("selectedPropertyId")
                    );

                    this.updateSelectedPropInCalenderResponse(defaults.programId, response);
                    _this.setSelectedPropertyName(selectedPropObj);
                }

                _this.updateAnalyticsData(response);
                if (callback) {
                    callback(response, errors);
                }
            }
        );
    }

    // updating selected property id in case of only programId in Calender Page
    updateSelectedPropInCalenderResponse(programId, response) {
        const _this = this;
        let selectedPropObj = "";
        if (programId && !this.filters.get("selectedPropertyId") && response.resorts && response.resorts.length === 1) {
            selectedPropObj = response.resorts[0];
            this.filters.set("selectedPropertyId", selectedPropObj.propertyDetail.id);
            _this.setSelectedPropertyName(selectedPropObj);
        }
    }

    // Updated service call for resort listing.
    getResortListData() {
        this.getResortList();
    }

    @action
    getResortList(filters = {}, data = {}, callback) {
        const serviceUrl = services["resortList"];
        const _this = this;
        let defaults = {},
            programId = this.filters.get("programId");
        programId ? (defaults.programId = programId) : null;

        if (this.editMode) {
            defaults.flow = "edit";
        }

        if (isNonPerpetual()) {
            defaults.nonPerpetual = true;
        }

        const params = filters
            ? this.parseQueryParams(Object.assign(defaults, filters))
            : this.parseQueryParams(defaults);

        this.resetCalendarDates = true;
        _this.responseErrors = "";
        if (data.clearArriveDepart) {
            this.clearArriveDepart();
        }

        this.dataRequest(
            serviceUrl,
            {
                id: "resortList",
                params,
                loadAnim: true,
                onComplete: (req, res, err) => {
                    data.onComplete && data.onComplete(req, res, err);
                }
            },

            (response, errors) => {
                _this.resortErrors = errors || null;
                _this.resorts = response.resorts || [];
                _this.reservationWindow = response.reservationWindow;
                if (!_this.isPerpetualOfferApplied) {
                    _this.offerDetails = response.offer || {};
                    _this.offer = response.offer || {};
                }

                _this.segmentOffer = {};
                _this.isOfferApplied = response.offer ? true : false;
                if (response.offer && response.offer.offerType == "segment") {
                    const programId = _this.filters.get("programId");
                    const selectedPropertyId = _this.filters.get("selectedPropertyId") || this.selectedPropertyIdClone;

                    _this.segmentOffer = response.resorts.find(item => {
                        return item.programId == programId;
                    });
                    if (!_this.segmentOffer && isEnableAllProperty()) {
                        _this.segmentOffer = response.resorts.find(item => {
                            return (
                                programId &&
                                item.segmentId == programId &&
                                (selectedPropertyId ? item.propertyId == selectedPropertyId : true)
                            );
                        });
                    }
                }

                if (isEnableAllProperty()) {
                    _this.setActiveRegion(this.activeRegion);
                    if (response && response.resorts) {
                        const selectedPropObj = response.resorts.find(
                            val => val.propertyDetail.id === _this.filters.get("selectedPropertyId")
                        );

                        _this.setSelectedPropertyName(selectedPropObj);
                    }
                }

                _this.updateAnalyticsData(response);
                if (callback) {
                    callback(response, errors);
                }
            }
        );
    }

    @action
    restartBookingFlow() {
        this.selectedPropertyIdClone = this.filters.get("selectedPropertyId") || "";
        this.filters.set("selectedPropertyId", "");
        this.defaultFilters.set("selectedPropertyId", "");

        this.filters.set("arrive", "");
        this.filters.set("depart", "");
        this.defaultFilters.set("arrive", "");
        this.defaultFilters.set("depart", "");

        this.roomTypeId = "";
        this.roomTypeIds = [];
        this.tooManyFilters = false;
        this.selectedFilters.clear();
        this.setRoomFilterOptions(this.handleClearFilter(this.roomFilterOptions));
    }

    @computed
    get searchUrl() {
        const params = [];
        const currentActiveRoute = this.activeComponent;
        const whiteListUrlKeys = currentActiveRoute ? this.urlList[currentActiveRoute] : [];

        for (const [key, val] of this.filters.entries()) {
            if (whiteListUrlKeys.indexOf(key) !== -1 && val) {
                params.push(key + "=" + val);
            }
        }

        if (this.selectedFilters.size) {
            for (const sval of this.selectedFilters.entries()) {
                params.push(sval[0] + "=" + sval[1]);
            }
        }

        if (currentActiveRoute === SELECT_DATE) {
            const arrive = this.defaultFilters.get("arrive");
            const depart = this.defaultFilters.get("depart");

            arrive && params.push("arrive=" + arrive);
            depart && params.push("depart=" + depart);
        }

        return params.join("&");
    }

    @action
    toggleCrossPropertyOffCanvas(val) {
        this.showCrossPropertyOffCanvas = val;
    }

    @action
    getCrossPropertyData(crossPropertyDataObj) {
        let filters = {};
        const serviceUrl = services["crossProperty"];
        const customLoader = crossPropertyDataObj.customLoader ? crossPropertyDataObj.customLoader : null;

        const _this = this;
        let defaults = {
                maxTripDuration: this.filters.get("maxTripDuration"),
                prevProgramId: this.filters.get("prevProgramId"),
                prevPromoCode: this.filters.get("prevPromoCode"),
                maximumNumberOfReservations: getMaxRooms()
            },
            promoCode = this.filters.get("promoCode"),
            programId = this.filters.get("programId");

        crossPropertyDataObj && crossPropertyDataObj.crossPropertyData
            ? (defaults.crossPropertyIds = crossPropertyDataObj.crossPropertyData.join())
            : "";
        promoCode ? (defaults.promoCode = promoCode) : null;
        programId ? (defaults.programId = programId) : null;

        if (isNonPerpetual()) {
            defaults.nonPerpetual = true;
        }

        filters = Object.assign(defaults, filters);
        const params = this.parseQueryParams(filters);

        this.dataRequest(
            serviceUrl,
            { id: "crossproperty", params, loadAnim: true, customLoader },
            (response, error) => {
                _this.crossPropertyData = orderBy(response.availability, ["price[value]"], ["desc"]);
                _this.crossPropertyError = error || null;
                _this.crossPropertyLoader = false;
            }
        );
    }

    clearRoomFilterItems(propertyFilters = []) {
        propertyFilters &&
            propertyFilters.map(categoryItem => {
                const options = get(categoryItem, "options", []);

                if (options[0]) {
                    options.map(item => (item.selected = false)); // eslint-disable-line no-return-assign
                }
            });
        return propertyFilters;
    }

    @action
    updateRoute(history, activeComponent) {
        this.history = history;
        this.activeComponent = activeComponent;
        analytics.clearDataElements();
        analytics.clearDigitalDataElements();
        if (this.activeComponent === SELECT_DATE) {
            this.setSelectDateDeepLinks();
            this.clearArriveDepart();
            analytics.clearDataElements();
            analytics.updateAnalytics(this.getDatesAnalyticsParam(), "calendar");
        } else if (this.activeComponent === SELECT_RESORT) {
            this.setSelectResortDeepLinks();
            analytics.updateAnalytics(this.getResortsAnalyticsParam(), "resorts");
        } else if (this.activeComponent === ROOM_LISTING) {
            this.setRoomListingDeepLinks();
            analytics.updateAnalytics(this.getRoomsAnalyticsParam(), "room");
        } else if (this.activeComponent === RESORT_AND_DATE) {
            this.setResortsAndDatesDeepLinks();
        }

        this.history.replace(URL_QUESTION_MARK + this.searchUrl);
    }

    /*
    Calendar Interaction Code Start
     */

    @action
    setRoomFilterOptions(roomFilterOptions = []) {
        this.roomFilterOptions = roomFilterOptions;
    }

    @computed
    get getRoomFilterOptions() {
        return this.roomFilterOptions;
    }

    getRoomTypeFilterCount() {
        const roomTypesLength = this.roomFilters && this.roomFilters.length;

        this.roomTypesCount = 0;
        for (let i = 0; i < roomTypesLength; i++) {
            if (this.roomFilters[i].id === "room-type") {
                this.roomTypesCount += this.roomFilters[i].options && this.roomFilters[i].options.length;
            }
        }
    }

    getRoomTypeCount() {
        return this.roomTypesCount || 0;
    }

    applyRoomFilterDeepLink() {
        const roomFilters = clonedeep(this.roomFilters);

        roomFilters &&
            roomFilters[0] &&
            roomFilters.map(categoryItem => {
                const options = get(categoryItem, "options", []);
                let itemIndices = [];
                let selFilters = this.selectedFilters;
                if (selFilters.has(categoryItem.id)) {
                    itemIndices = selFilters.get(categoryItem.id).split("|");
                }

                if (options[0]) {
                    options.map((item, index) => {
                        if (itemIndices.indexOf(String(index)) > -1) {
                            item.selected = true;
                        } else {
                            item.selected = false;
                        }
                    });
                }
            });
        this.getRoomTypeFilterCount(roomFilters);
        this.applyFilterOptions(roomFilters, true);
    }

    applyFilterOptions(filters = [], isDeepLink = false) {
        const checkedRoomIds = [];
        let selectedId = "";
        let selectedFilters = [];
        let globalfilters = [];
        let propSpecificFilters = [];
        let selectedRoomTypes = [];
        let anyFilterSelected = false;

        if (this.globalfilters.size > 0) {
            globalfilters = [...this.globalfilters];
        }

        if (this.propSpecificFilters.size > 0) {
            propSpecificFilters = [...this.propSpecificFilters];
        }

        filters.map(categoryItem => {
            selectedId = categoryItem.id;
            const options = get(categoryItem, "options", []);

            if (options[0]) {
                let roomTypeIds = [];
                const selectedItems = [];
                let selectedIndices = "";
                let hasSelectedFilter = false;
                let allFiltersOpted = false;
                options.map((item, index) => {
                    if (item.selected === true && !allFiltersOpted) {
                        anyFilterSelected = true;
                        hasSelectedFilter = true;
                        selectedItems.push(String(index).toString());
                        if (selectedId === "room-type") {
                            selectedRoomTypes.push(item.title);
                        }

                        if (item.roomTypeId && item.roomTypeId[0]) {
                            roomTypeIds = roomTypeIds.concat(item.roomTypeId);
                        } else {
                            allFiltersOpted = true;
                        }
                    }
                });
                if (allFiltersOpted) roomTypeIds = [];

                if (selectedItems && selectedItems[0]) {
                    selectedIndices = selectedItems.join("|");
                }

                if (selectedIndices) {
                    selectedFilters.push([selectedId, selectedIndices]);
                    if (this.isResortsAndDateView) {
                        if (categoryItem.type === "globalFilters" || categoryItem.type === "adaFilters") {
                            globalfilters.push([selectedId, selectedIndices]);
                        } else {
                            propSpecificFilters.push([selectedId, selectedIndices]);
                        }
                    }
                }

                if (roomTypeIds && roomTypeIds[0] && hasSelectedFilter) checkedRoomIds.push(union([...roomTypeIds]));
            }
        });

        if (this.isResortsAndDateView) {
            this.globalfilters = new Map(globalfilters);
            this.propSpecificFilters = new Map(propSpecificFilters);
        }

        this.setRoomFilterOptions(filters);
        this.setTopNavRoomFilters(selectedRoomTypes);
        anyFilterSelected
            ? this.setRoomFilters(selectedFilters, checkedRoomIds)
            : !isDeepLink
            ? this.clearRoomFilters()
            : "";
    }

    @action
    setRoomFilters(selectedFilters, storedFilters) {
        let roomTypeId = "",
            roomTypeIds = [];

        this.tooManyFilters = false;
        if (storedFilters) {
            roomTypeIds = intersection.apply(null, storedFilters); // eslint-disable-line prefer-spread
            if (storedFilters.length > 0) {
                if (roomTypeIds.length) {
                    if (this.isScaffoldingRefresh && roomTypeIds.length > 1) {
                        const filterRoomTypeId = roomTypeIds;
                        const tooManyFilterIndex = roomTypeIds.indexOf("too-many-filters");

                        if (tooManyFilterIndex > -1) {
                            filterRoomTypeId.splice(tooManyFilterIndex, 1);
                        }

                        roomTypeId = filterRoomTypeId.join("!!");
                    } else {
                        roomTypeId = roomTypeIds.join("!!");
                    }
                } else {
                    roomTypeId = "too-many-filters";
                }
            }
        }

        if (this.isResortsAndDateView) {
            this.selectedFilters = new Map([...this.selectedFilters, ...selectedFilters]);
        } else {
            this.selectedFilters = new Map(selectedFilters);
        }

        this.roomTypeId = roomTypeId;
        this.roomTypeIds = roomTypeIds;

        this.checkAvailableRooms(roomTypeIds);
        if (selectedFilters && selectedFilters.length) {
            this.history.replace(URL_QUESTION_MARK + this.searchUrl);
        }

        if (this.activeComponent === SELECT_DATE) {
            this.rateCalendarData();
        }

        if (this.activeComponent === RESORT_AND_DATE) {
            this.updateCachedResortCalendarData();
            if (
                this.filters.has("arrive") &&
                this.filters.get("arrive") &&
                this.filters.has("depart") &&
                this.filters.get("depart")
            ) {
                this.getResortPriceForEligibleResorts();
            }
        }
    }

    getAdditionalFilters(options, propertyId) {
        if (options.tripPricing) {
            let filters = this.getTripPricingFiltersMultiCalendar(options.checkInDate, propertyId);
            return filters;
        }

        return {};
    }

    isValidStatus(status) {
        return [AVAILABLE, OFFER, NO_ARRIVAL, FREENIGHT].find(value => {
            return value === status;
        });
    }

    isAvailableDate(propertyId, date) {
        const propertyData = this.propertyCalendarMap.get(`${propertyId}`);
        const dateMatch = propertyData.find(item => {
            return item.date === date;
        });

        if (dateMatch) {
            return this.isValidStatus(dateMatch.status);
        }

        return false;
    }

    @action
    alertInvalidDate(propertyId) {
        this.resortPriceErrorMap.set(`${propertyId}`, { code: INVALID_DATE });
    }

    handleAvailabilityForCachedResortCalendar(date) {
        for (const propertyId of this.propertyCalendarMap.keys()) {
            if (!this.isAvailableDate(propertyId, date)) {
                this.alertInvalidDate(propertyId);
            }
        }
    }

    updateCachedResortCalendarData(options = {}) {
        let data = options.data || {};
        let callback = options.callback;
        const cachedProperties = [...this.propertyCalendarMap.keys()];

        cachedProperties[0] &&
            cachedProperties.map(item => {
                this.getResortCalendar(
                    {
                        selectedPropertyId: item,
                        ...this.getAdditionalFilters(options, item)
                    },
                    {
                        propertyId: item,
                        ...data
                    },
                    callback
                );
            });
    }

    @action
    checkAvailableRooms(roomTypeIds = this.roomTypeIds) {
        let allRooms, availableRoomTypeIds, filteredRoomTypeIds;
        this.tooManyFilters = false;
        if (this.selectedFiltersCount && roomTypeIds && roomTypeIds.length) {
            allRooms = this.rooms.concat(this.adaRooms);
            availableRoomTypeIds = Array.from(allRooms, x => x.roomTypeId);
            filteredRoomTypeIds = intersection(roomTypeIds, availableRoomTypeIds);
            if (
                allRooms &&
                allRooms[0] &&
                (!filteredRoomTypeIds || (filteredRoomTypeIds && filteredRoomTypeIds.length === 0))
            ) {
                this.tooManyFilters = true;
            }
        }

        if (this.roomTypeId === "too-many-filters") {
            this.tooManyFilters = true;
            this.roomTypeIds = ["too-many-filters"];
        }
    }

    @computed
    get areValidDates() {
        return (
            this.validTravelDates &&
            (this.isCabana ||
                ((this.filters.get("arrive") && this.filters.get("depart")) ||
                    (!this.filters.get("arrive") && !this.filters.get("depart"))))
        );
    }

    @action
    setValidTravelDates(val) {
        this.validTravelDates = val;
    }

    @action
    setTopNavRoomFilters(val = []) {
        this.selectedRoomFilterTypes = val;
    }

    handleClearFilter(propertyFilters) {
        propertyFilters.map(categoryItem => {
            const options = get(categoryItem, "options", []);

            if (options[0]) {
                options.map(item => (item.selected = false)); // eslint-disable-line no-return-assign
            }
        });
        return propertyFilters;
    }

    @action
    clearRoomFilters() {
        this.roomTypeId = "";
        this.roomTypeIds = [];
        this.tooManyFilters = false;
        this.selectedFilters.clear();
        if (this.isScaffoldingRefresh || this.isResortsAndDateView) {
            this.setTopNavRoomFilters();
            if (this.activeComponent === SELECT_DATE) {
                this.rateCalendarData();
            }

            if (this.activeComponent === RESORT_AND_DATE) {
                this.updateMultiCalendarAndResortPrice();
                this.globalfilters.clear();
                this.selectedFilters = this.propSpecificFilters;
            }

            if (this.activeComponent === ROOM_LISTING && this.isResortsAndDateView) {
                this.globalfilters.clear();
                this.propSpecificFilters.clear();
            }

            this.setRoomFilterOptions(this.handleClearFilter(this.roomFilterOptions));
        }

        this.history.replace(URL_QUESTION_MARK + this.searchUrl);
    }

    @computed
    get selectedFiltersCount() {
        return this.selectedFilters.size;
    }

    @computed
    get roomFilters() {
        const roomFilters = getRoomFilters();

        if (isResortsAndDateView() && this.activeComponent === RESORT_AND_DATE) {
            return roomFilters && roomFilters["globalFilters"];
        }

        const propertySiteId = this.filters.get("propertyId") || singlePropertyId();
        const selectedPropertyId = isEnableAllProperty()
            ? this.getFilterValue("selectedPropertyId", this.filters.get("selectedPropertyId"))
            : this.getFilterValue("selectedPropertyId", propertySiteId);

        return roomFilters && roomFilters[selectedPropertyId] ? roomFilters[selectedPropertyId] : [];
    }

    @action
    toogleRoomFilterCanvas() {
        if (action === "open") {
            this.showFilterOffCanvas = true;
        } else if (action === "close") {
            this.showFilterOffCanvas = false;
        } else {
            this.showFilterOffCanvas = !this.showFilterOffCanvas;
        }
    }

    @action
    toogleRedesignFilterOffCanvas(status) {
        if (status === "open") {
            this.showRedesignFilterOffCanvas = true;
        } else if (status === "close") {
            this.showRedesignFilterOffCanvas = false;
        } else {
            this.showRedesignFilterOffCanvas = !this.showRedesignFilterOffCanvas;
        }
    }

    @action
    selectDepart(e, arrive, depart, removeOffer, tripPricing = false) {
        if (this.isCabana && !this.validTravelDates) return false;
        removeOffer && this.removeOffer();
        if (datediff(arrive, depart, "m/d/y") <= getMaxNights()) {
            let route = false;
            route = this.routes.find(val => val.component === ROOM_LISTING);
            if (route) {
                this.filters.set("arrive", parseDate(arrive, "m/d/y", "y-m-d"));
                if (!this.isCabana) this.filters.set("depart", parseDate(depart, "m/d/y", "y-m-d"));
                this.updateDefaultFiltersWithFilters(["arrive", "depart"]);
                this.history.push(route.url + URL_QUESTION_MARK + this.searchUrl);
                if (tripPricing) {
                    this.resetRateResponseToDefaultPricing();
                }
            }
        } else {
            this.clearArriveDepart();
        }
    }

    @action
    navigateToRoomListing(propertyId) {
        if (
            this.filters.has("selectedPropertyId") &&
            this.filters.get("selectedPropertyId") &&
            this.filters.get("selectedPropertyId") !== propertyId
        ) {
            this.selectedFilters = this.globalfilters;
        }

        this.filters.set("selectedPropertyId", propertyId);
        const route = this.routes.find(val => val.component === ROOM_LISTING);

        this.history.push(route.url + URL_QUESTION_MARK + this.searchUrl);
    }

    getResortsWithNoMinError(resorts, selectedDatesDiff) {
        let filteredResorts = [],
            minErrorResortsIds = [],
            minNightErrorResorts = [];

        this.propertyOfferMap.forEach((value, key) => {
            if (selectedDatesDiff < value.minimumDays) {
                minErrorResortsIds.push(key);
            }
        });

        resorts.forEach(resort => {
            if (!minErrorResortsIds.includes(resort.propertyDetail.id)) {
                filteredResorts.push(resort);
            } else {
                minNightErrorResorts.push(resort);
            }
        });
        return { filteredResorts, minNightErrorResorts };
    }

    @action
    minNightSatisfied(val, propertyId) {
        if (
            val &&
            this.resortPriceErrorMap.get(propertyId) &&
            this.resortPriceErrorMap.get(propertyId).code === ERROR_MIN_NIGHT_ERROR
        ) {
            this.resortPriceErrorMap.delete(propertyId);
        }
    }

    getResortPriceForEligibleResorts(resorts = []) {
        const resortLen = resorts.length;

        for (let i = 0; i < resortLen; i++) {
            this.getResortPrice(
                { selectedPropertyId: resorts[i].propertyDetail.id },
                {
                    propertyId: resorts[i].propertyDetail.id,
                    disableScrollToTop: true,
                    enableComponentLoaderOverLay: {
                        componentName: "ResortListItem",
                        label: refreshPricesOverlay()
                    }
                }
            );
        }
    }

    @action
    handleMinNightErrorResorts(resorts = []) {
        resorts.forEach(resort => {
            this.resortPriceErrorMap.set(resort.propertyDetail.id, this.minNightErrorObj);
        });
    }

    @action
    handleMinNightErrorOnArrive(propertyId) {
        this.resortPriceErrorMap.set(propertyId, this.minNightErrorObj);
    }

    @action
    onResortCalendarDepartSelection(arrive, depart) {
        if (datediff(arrive, depart, "m/d/y") <= getMaxNights()) {
            this.filters.set("arrive", parseDate(arrive, "m/d/y", "y-m-d"));
            this.filters.set("depart", parseDate(depart, "m/d/y", "y-m-d"));
            this.updateDefaultFiltersWithFilters(["arrive", "depart"]);
            const resorts = this.getResortsWithNoMinError(this.resorts, datediff(arrive, depart, "m/d/y"));

            this.getResortPriceForEligibleResorts(resorts.filteredResorts);
            this.handleMinNightErrorResorts(resorts.minNightErrorResorts);
        } else {
            this.clearArriveDepart();
        }
    }

    getTripPricingFilters(checkInDate) {
        const maxTripDuration = Number.parseInt(this.filters.get("maxTripDuration"), 10);
        let checkOutDate = moment(checkInDate)
            .add(maxTripDuration, "days")
            .format("MM/DD/YYYY");
        const calData =
            (this.rateResponseWithoutTripPricing.resp && this.rateResponseWithoutTripPricing.resp.calendar) || [];
        const firstMatchingIndex = calData.findIndex(day => {
            return day.date === checkInDate;
        });

        for (let i = 1; i <= maxTripDuration; i += 1) {
            if (calData[firstMatchingIndex + i] && calData[firstMatchingIndex + i].status === SOLD_OUT) {
                checkOutDate = calData[firstMatchingIndex + i].date;
                break;
            }
        }

        return {
            checkInDate,
            checkOutDate,
            tripPricing: true
        };
    }

    getTripPricingFiltersMultiCalendar(checkInDate, propertyId) {
        const maxTripDuration = Number.parseInt(this.filters.get("maxTripDuration"), 10);
        let checkOutDate = moment(checkInDate)
            .add(maxTripDuration, "days")
            .format("MM/DD/YYYY");
        const calData =
            (this[`rateResponseWithoutTripPricing_${propertyId}`].resp &&
                this[`rateResponseWithoutTripPricing_${propertyId}`].resp.calendar) ||
            [];
        const firstMatchingIndex = calData.findIndex(day => {
            return day.date == checkInDate;
        });

        for (let i = 1; i <= maxTripDuration; i += 1) {
            if (calData[firstMatchingIndex + i].status === SOLD_OUT) {
                checkOutDate = calData[firstMatchingIndex + i].date;
                break;
            }
        }

        return {
            checkInDate,
            checkOutDate,
            selectedPropertyId: propertyId,
            tripPricing: true
        };
    }

    updateDefaultFiltersWithFilters(keys = []) {
        const filters = this.filters;

        keys.map(key => {
            this.defaultFilters.set(key, filters.get(key));
        });
    }

    updateFiltersWithDefault() {
        const filters = new Map([...this.defaultFilters, ...this.filters]);

        this.filters.set("arrive", filters.get("arrive"));
        this.filters.set("depart", filters.get("depart"));
    }

    @action
    updateSelectedPropertyIdFilter(id) {
        this.filters.set("selectedPropertyId", id);
    }

    validateProgramId(id, data) {
        let programId = id;
        if (data && data.removeOffer) {
            return programId;
        }

        if (isEnableAllProperty() && this.offer && this.offer.ccmType === "segments") {
            if (this.filters.get("segmentId")) {
                programId = this.filters.get("propertyProgramId");
            } else {
                const offerResortItem = this.resorts.find(
                    item =>
                        item.segmentId === programId &&
                        item.propertyDetail &&
                        item.propertyDetail.id === this.filters.get("selectedPropertyId")
                );

                programId = (offerResortItem && offerResortItem.programId) || programId;
            }
        }

        return programId;
    }

    @action
    clearArriveDepart() {
        this.filters.delete("arrive");
        this.filters.delete("depart");
    }

    @action
    toggleOffCanvas() {
        this.showOffCanvas = !this.showOffCanvas;
    }

    @action
    toggleOfferCanvas(status) {
        if (status === "open") {
            this.showOfferCanvas = true;
            const selectedPropertyId = isEnableAllProperty()
                ? this.filters.get("selectedPropertyId")
                : this.filters.get("propertyId");
            const bookableHotelList = bookableHotels();

            if (bookableHotelList) {
                const property = bookableHotelList.find(item => item.propertyId === selectedPropertyId);

                if (property && property.propertyId) {
                    this.filters.set("regionFilter", property.propertyId);
                    this.locationPropertyName = this.selectedPropertyName;
                } else {
                    // when no property is slected or (in resort listing page with offer)
                    // setting it to null to display the defult value
                    this.locationPropertyName = null;
                }
            }
        } else if (status === "close") {
            setItem("offerOffCanvas", 0);
            this.filters.delete("regionFilter");
            this.showOfferCanvas = false;
        }
    }

    @action
    toggleOffCanvasAndClearArriveDepart() {
        this.showOffCanvas = false;
        this.clearArriveDepart();
        this.updateFiltersWithDefault();
    }

    @action
    updateArriveDate(date) {
        if (date) this.filters.set("arrive", parseDate(date, "m/d/y", "y-m-d"));
        else this.filters.delete("arrive");
    }

    @action
    updateDepartDate(date) {
        if (date) this.filters.set("depart", parseDate(date, "m/d/y", "y-m-d"));
        else this.filters.delete("depart");
    }

    @action
    changeView(view = "") {
        if (!view) {
            return;
        }

        let route = this.routes.find(val => val.component === view),
            query = URL_QUESTION_MARK + this.searchUrl;
        if (this.activeComponent === ROOM_LISTING) {
            this.history.push(route.url + query);
        }
    }

    @action
    applyPromoCode(promoCode, cb) {
        let route = this.routes.find(val => val.component === SELECT_DATE),
            query = URL_QUESTION_MARK + this.searchUrl;

        this.filters.delete("programId");

        if (this.filters.get("promoCode") === promoCode) {
            this.isPromoCodeApplied = this.offer && this.offer.promoCode ? true : false;

            if (this.activeComponent !== SELECT_DATE) {
                this.history.push(route.url + query);
            } else {
                this.history.replace(query);
            }

            this.toggleOfferCanvas("close");

            if (cb) {
                cb(this.getResponseErrors);
            }
        } else {
            this.offer = {};
            this.offerDetails = {};
            this.filters.set("promoCode", promoCode);

            query = URL_QUESTION_MARK + this.searchUrl;

            this.rateCalendarData(
                false,
                {
                    beforeSend: () => {
                        this.promoCodeErrors = null;
                    }
                },
                (response, errors) => {
                    this.isPromoCodeApplied = response.offer && response.offer.promoCode ? true : false;
                    this.promoCodeErrors = errors || null;

                    if (this.activeComponent !== SELECT_DATE) {
                        this.history.push(route.url + query);
                    } else {
                        this.history.replace(query);
                    }

                    if (response && Object.keys(response).length !== 0) {
                        this.toggleOfferCanvas("close");
                    }

                    if (cb) {
                        cb(errors);
                    }
                }
            );
        }
    }

    /*
        On applying offer of differnt loaction updating the location detailes.
    */
    updatedLocationDetails() {
        this.filters.set("selectedRegion", "");
        this.defaultFilters.set("selectedRegion", "");
        let defaultRegion = this.getDefaultRegion;
        if (defaultRegion) {
            this.setActiveRegion(defaultRegion);
            this.filters.set("selectedRegion", defaultRegion);
        }
    }

    @action
    applyOffer(programId, propertyId) {
        const dateRoute = isMultiCalanderTemplate ? RESORT_AND_DATE : SELECT_DATE;
        const resortsRoute = isMultiCalanderTemplate ? RESORT_AND_DATE : SELECT_RESORT;

        if (isEnableAllProperty() && propertyId) {
            const propId =
                String(propertyId).split(",").length === 1 ? propertyId : this.filters.get("selectedPropertyId");

            this.filters.set("selectedPropertyId", propId);
        }

        if (!isNonPerpetual() && this.offer && this.offer.isPerpetualOffer === true) {
            this.filters.set("po", "0");
        }

        if (this.filters.get("programId") === programId) {
            this.toggleOfferCanvas("close");
        } else {
            this.offer = {};
            this.offerDetails = {};
        }

        this.filters.set("programId", programId);
        this.filters.set("partialOffer", true);
        this.filters.delete("promoCode");
        this.isPromoCodeApplied = false;

        if (programId !== this.filters.get("segmentId")) {
            this.filters.delete("segmentId");
            this.filters.delete("propertyProgramId");
        }

        const datesRoute = this.routes.find(val => val.component === dateRoute),
            resortRoute = this.routes.find(val => val.component === resortsRoute),
            resortAndDateRoute = this.routes.find(val => val.component === RESORT_AND_DATE);

        let selectedPropertyId = this.filters.get("selectedPropertyId");
        this.isPerpetualOfferApplied = false;
        this.propertyOfferMap.set(propertyId, this.offer);

        if (this.activeComponent === resortsRoute || isMultiCalanderTemplate) {
            this.getResortList(null, false, response => {
                this.clearDatesFromApplication();
                const isSegment = response && response.offer && response.offer.offerType === "segment";

                if (isSegment) {
                    this.filters.set("selectedPropertyId", "");
                }

                this.updatedLocationDetails();
                this.filters.set("selectedPropertyId", selectedPropertyId);
                const query = URL_QUESTION_MARK + this.searchUrl;

                if (isMultiCalanderTemplate) {
                    this.activeComponent === resortAndDateRoute
                        ? this.history.replace(query)
                        : this.history.push(datesRoute.url + query);
                    this.resortPriceMap.clear();
                    this.resortPriceErrorMap.clear();
                } else {
                    !isSegment ? this.history.push(datesRoute.url + query) : this.history.replace(query);
                }

                if (response && this.activeComponent === resortsRoute && this.resortErrors !== null) {
                    this.resortErrors = null;
                }

                this.closeOfferCanvas(response);
            });
        } else {
            this.rateCalendarData(false, false, response => {
                this.clearDatesFromApplication();
                const isSegment = response && response.offer && response.offer.offerType === "segment";

                if (isSegment) {
                    this.filters.set("selectedPropertyId", "");
                }

                this.updatedLocationDetails();
                this.filters.set("selectedPropertyId", selectedPropertyId);
                const query = URL_QUESTION_MARK + this.searchUrl;

                if (this.activeComponent !== dateRoute && !isSegment) {
                    this.history.push(datesRoute.url + query);
                } else if (isSegment && this.activeComponent !== resortsRoute) {
                    this.history.push(resortRoute.url + query);
                } else {
                    this.history.replace(query);
                }

                this.closeOfferCanvas(response);
            });
        }
    }

    closeOfferCanvas(response) {
        if (response && Object.keys(response).length !== 0) {
            this.toggleOfferCanvas("close");
        }
    }

    clearDatesFromApplication() {
        this.filters.set("arrive", "");
        this.filters.set("depart", "");
        this.defaultFilters.set("arrive", "");
        this.defaultFilters.set("depart", "");
    }

    @action
    viewOffers() {
        this.toggleOfferCanvas("open");
    }

    removeProgramId() {
        this.filters.delete("prevProgramId");
        this.filters.delete("prevPromoCode");
        this.filters.delete("programId");
        this.filters.delete("promoCode");
        this.filters.delete("segmentId");
        this.filters.delete("propertyProgramId");
        this.isPromoCodeApplied = false;
        let route = this.routes.find(val => val.component === this.activeComponent),
            query = URL_QUESTION_MARK + this.searchUrl;
        this.history.push(route.url + query);
        this.globalWarnings = null;
    }

    @action
    removeOffer(removePerpetualOffer = true) {
        const prevProgramId = this.filters.get("programId");

        this.removeProgramId();
        const crossPropertyRooms = getCrossPropertyRooms();

        if (!isNonPerpetual() && removePerpetualOffer && (this.offer && this.offer.isPerpetualOffer === true)) {
            this.filters.set("po", "0");
        }

        this.isPerpetualOfferApplied = false;

        this.propertyOfferMap.delete(this.filters.get("selectedPropertyId"));

        switch (this.activeComponent) {
            case SELECT_DATE:
                this.offerUpdateIncalender(prevProgramId);
                break;
            case ROOM_LISTING:
                this.getListCallData(
                    {
                        prevProgramId,
                        partialOffer: false
                    },
                    {
                        removeOffer: true,
                        onComplete: () => {
                            this.prevParams.delete("calendar__params");
                            this.prevParams.delete("calendar__isPending");
                            this.segmentOffer = {};
                            this.offer = {};
                        }
                    }
                );
                if (
                    (isEnableAllProperty() && this.offer && this.offer.ccmType === "segments") ||
                    (this.offer && this.offer.isPerpetualOffer === true)
                ) {
                    this.getCrossPropertyData({
                        crossPropertyData: crossPropertyRooms.propertyIds,
                        customLoader: () => {
                            this.crossPropertyLoader = true;
                            this.isSegmentOffer = false;
                        } // eslint-disable-line no-return-assign
                    });
                }

                if (this.viewport === "small") {
                    this.offerUpdateIncalender(prevProgramId);
                }

                break;
            case SELECT_RESORT:
                this.getResortList(
                    {
                        prevProgramId,
                        partialOffer: false
                    },
                    {
                        removeOffer: true,
                        onComplete: () => {
                            this.prevParams.delete("calendar__params");
                            this.prevParams.delete("calendar__isPending");
                            this.segmentOffer = {};
                            this.offer = {};
                        }
                    }
                );
                if (this.viewport === "small") {
                    this.offerUpdateIncalender(prevProgramId);
                }

                break;
            case RESORT_AND_DATE:
                this.getResortList(
                    {
                        prevProgramId,
                        partialOffer: false
                    },
                    {
                        removeOffer: true,
                        onComplete: () => {
                            this.prevParams.delete("calendar__params");
                            this.prevParams.delete("calendar__isPending");
                            this.segmentOffer = {};
                            this.offer = {};
                        }
                    }
                );
                if (this.viewport === "small") {
                    this.offerUpdateIncalender(prevProgramId);
                }

                break;
            default:
                break;
        }

        this.history.replace(URL_QUESTION_MARK + this.searchUrl);
    }

    offerUpdateIncalender(prevProgramId) {
        this.rateCalendarData(
            {
                prevProgramId,
                partialOffer: false
            },
            {
                onComplete: () => {
                    this.segmentOffer = {};
                }
            }
        );
    }

    @action
    updateSelectedPropertyId(selectedPropertyIds, propertyName) {
        this.locationPropertyName = propertyName;
        const query = `${this.searchUrl}`;

        this.history.replace(URL_QUESTION_MARK + query);
        this.getRoomOffersList(selectedPropertyIds);
    }

    @action
    sortBy(type, order) {
        if (type && order) {
            switch (type) {
                case "price":
                    this.sortByPrice = order;
                    break;
                default:
                    break;
            }
        }
    }

    @action
    sortResortBy(type, order) {
        if (type && order) {
            switch (type) {
                case "price":
                    this.resortSortOrder = order;
                    break;
                default:
                    break;
            }
        }
    }

    @action
    onSessionEnd() {
        this.clearRoomFilters();
        this.showSignInModel = false;
        this.showOffCanvas = false;
        this.showFilterOffCanvas = false;
        this.showRedesignFilterOffCanvas = false;
        this.showOffCanvas = false;
    }

    /*
    Calendar Interaction Code End
     */

    /** *
     **Select Travel Date Start
     ** */

    @action
    selectTravelDates() {
        if (!this.areValidDates) return;
        let arrive = this.defaultFilters.get("arrive"),
            depart = this.defaultFilters.get("depart"),
            selectedPropertyId = isEnableAllProperty() ? this.filters.get("selectedPropertyId") : singlePropertyId(),
            roomListingRoute = this.routes.find(val => val.component === ROOM_LISTING),
            resortListRoute = this.routes.find(val => val.component === SELECT_RESORT),
            selectDateRoute = this.routes.find(val => val.component === SELECT_DATE),
            routeToNavigate = {};
        const arriveDepart = this.isCabana ? arrive : arrive && depart;

        if (this.activeComponent !== selectDateRoute.component) {
            this.previousRoute = this.routes.find(val => val.component === this.activeComponent);
            this.history.push(selectDateRoute.url + URL_QUESTION_MARK + this.searchUrl);
        } else if (arriveDepart) {
            routeToNavigate = selectedPropertyId ? roomListingRoute : resortListRoute;
            this.updateFiltersWithDefault();
            this.history.push(routeToNavigate.url + URL_QUESTION_MARK + this.searchUrl);
        }
    }

    /** *
     **Select Travel Date End
     ** */

    /*
     * Select Guest Menu Code Start
     */

    @action
    updateActiveGuestIndex(index) {
        let numGuests = index;
        if (numGuests > this.maxGuests) {
            numGuests = this.isCabana ? this.maxGuests + "+" : this.maxGuests;
        }

        if (numGuests == this.filters.get("numAdults")) return;

        this.filters.set("numAdults", numGuests);
        this.filters.set("numGuests", numGuests);
        if (this.activeComponent === SELECT_DATE) {
            if (!this.filters.get("depart")) {
                this.filters.set("depart", "");
            }

            this.rateCalendarData(false, { clearArriveDepart: true });
        } else if (this.activeComponent === ROOM_LISTING) {
            this.getListCallData();
        } else if (this.activeComponent === RESORT_AND_DATE) {
            this.updateMultiCalendarAndResortPrice();
        } else {
            this.getResortList();
        }

        const query = `${this.searchUrl}`;

        this.history.replace(URL_QUESTION_MARK + query);
        this.updateNumGuest = !this.updateNumGuest;
    }
    /*
     * Select Guest Menu Code End
     */
    /*
     * Top Nav Select A Resort Start
     */

    @action
    selectAResort() {
        if (!this.areValidDates) return;
        const selectResortRoute = this.routes.find(val => val.component === SELECT_RESORT),
            resortAndDateRoute = this.routes.find(val => val.component === RESORT_AND_DATE),
            roomListRoute = this.routes.find(val => val.component === ROOM_LISTING),
            selectDateRoute = this.routes.find(val => val.component === SELECT_DATE),
            resortRoute = isResortsAndDateView() ? resortAndDateRoute : selectResortRoute,
            arrive = this.filters.get("arrive"),
            depart = this.filters.get("depart"),
            selectedProperty = isEnableAllProperty() ? this.filters.get("selectedPropertyId") : singlePropertyId(),
            arriveDepart = this.isCabana ? arrive : arrive && depart;

        this.updateFiltersWithDefault();
        if (this.activeComponent !== resortRoute.component) {
            this.history.push(resortRoute.url + URL_QUESTION_MARK + this.searchUrl);
        } else if (selectedProperty) {
            const baseURL = arriveDepart ? roomListRoute.url : selectDateRoute.url;

            this.history.push(baseURL + URL_QUESTION_MARK + this.searchUrl);
        }
    }

    /*
     * Top Nav Select A Resort End
     */

    @action
    onResortSelection(
        e,
        selectedPropertyId,
        selectedPropertyName,
        propertyProgramId,
        segmentId,
        cabanasBookingPhoneNumber
    ) {
        let arrive = this.filters.get("arrive"),
            depart = this.filters.get("depart"),
            targetRoute = arrive && depart ? ROOM_LISTING : SELECT_DATE,
            route = this.routes.find(val => val.component === targetRoute),
            filters = {};
        if (route) {
            this.clearRoomFilters();
            this.filters.set("selectedPropertyId", selectedPropertyId);
            this.selectedPropertyName = selectedPropertyName;
            this.history.push(route.url);
            this.updateDefaultFiltersWithFilters(["selectedPropertyId"]);
        }

        if (segmentId) {
            filters.offerType = "segment";
            filters.partialOffer = true;
            filters.programId = propertyProgramId;
            this.filters.set("programId", segmentId);
            this.filters.set("segmentId", segmentId);
            this.filters.set("propertyProgramId", propertyProgramId);
        } else {
            this.filters.delete("segmentId");
            this.filters.delete("propertyProgramId");
            if (this.filters.get("programId") !== propertyProgramId) {
                this.filters.delete("programId");
            }
        }

        this.cabanasBookingPhoneNumber = cabanasBookingPhoneNumber || null;

        if (this.viewport === "small") {
            this.rateCalendarData();
        }

        if (arrive && depart) {
            this.getListCallData(filters);
        }
    }

    @action
    makeIataCall(iataValue, callback) {
        let filters = {},
            id = "iata",
            _this = this,
            serviceUrl = services[id],
            defaults = {
                agentId: iataValue,
                bookingRefresh: true,
                propertyId: singlePropertyId(),
                numAdults: this.filters.get("numAdults")
            };
        filters = Object.assign(defaults, filters);
        const params = this.parseQueryParams(filters);

        _this.dataRequest(serviceUrl, { id, params, loadAnim: true }, callback);
    }

    @computed
    get getSelectedRoomTypeIds() {
        return this.roomTypeIds;
    }

    @computed
    get getRooms() {
        const order = this.sortByPrice === PRICE_ASCENDING ? "asc" : "desc";
        const rooms =
            this.selectedFilters.size && this.roomTypeIds && this.roomTypeIds.length
                ? this.rooms.filter(room => this.roomTypeIds.indexOf(room.roomTypeId) > -1)
                : this.rooms;

        return orderBy(rooms, ["price[value]"], [order]);
    }

    @computed
    get getADARooms() {
        const order = this.sortByPrice === PRICE_ASCENDING ? "asc" : "desc";
        const rooms =
            this.selectedFilters.size && this.roomTypeIds && this.roomTypeIds.length
                ? this.adaRooms.filter(room => this.roomTypeIds.indexOf(room.roomTypeId) > -1)
                : this.adaRooms;

        return orderBy(rooms, ["price[value]"], [order]);
    }

    @computed
    get getSelectedRooms() {
        const order = this.sortByPrice === PRICE_ASCENDING ? "asc" : "desc";

        return orderBy(this.selectedRooms, ["price[value]"], [order]);
    }

    @action
    updateResortSortState(state) {
        this.enableResortSorting = state;
    }

    @action
    updateResortSortPriceState(state) {
        this.resortSortOrder = state;
    }

    @action
    enableOverlayLoader(config) {
        this.overLayLoaderConfig = config;
    }

    @action
    disableLoaderOverlay() {
        this.overLayLoaderConfig = null;
    }

    @action
    enableComponentOverlayLoader(config) {
        this.componentLoaderConfigMap.set(`${config.componentName}`, config);
    }

    @action
    disableComponentLoaderOverlay(config) {
        this.componentLoaderConfigMap.delete(`${config.componentName}`);
    }

    get getResorts() {
        const resorts = this.getResortsByRegion;

        if (!this.isCabana) {
            const soldOut = [];
            const resortsWithPrices = resorts.filter(item => {
                if ((item["roomPrice"] && item["roomPrice"]["value"]) || item["isComp"]) {
                    return true;
                }
            });
            const notSoldOut = resorts.filter(item => {
                if ((item["status"] && item["status"].toUpperCase() === AVAILABLE) || item["isComp"]) {
                    return true;
                }

                soldOut.push(item);
            });

            if (resortsWithPrices.length > 0) {
                this.updateResortSortState(true);
            } else {
                this.updateResortSortPriceState(PRICE_DEFAULT);
                this.updateResortSortState(false);
            }

            if (this.resortSortOrder === PRICE_DEFAULT) {
                const allResorts = notSoldOut.concat(soldOut);
                const orderByName = orderBy(
                    allResorts,
                    [
                        o => {
                            return (o["propertyDetail"] && o["propertyDetail"]["name"].toLowerCase()) || "";
                        }
                    ],
                    ["asc"]
                );
                const orderByCorporate = orderBy(
                    orderByName,
                    [
                        o => {
                            return (o["propertyDetail"] && o["propertyDetail"]["corporateSortOrder"]) || "";
                        }
                    ],
                    ["asc"]
                );

                return orderByCorporate;
            } else {
                const order = this.resortSortOrder === PRICE_ASCENDING ? "asc" : "desc";

                return orderBy(
                    resortsWithPrices,
                    [
                        o => {
                            return (o["roomPrice"] && o["roomPrice"]["value"]) || "";
                        }
                    ],
                    [order]
                ).concat(soldOut);
            }
        } else {
            const orderByName = orderBy(
                resorts,
                [
                    o => {
                        return (o["propertyDetail"] && o["propertyDetail"]["name"].toLowerCase()) || "";
                    }
                ],
                ["asc"]
            );
            const orderByCorporate = orderBy(
                orderByName,
                [
                    o => {
                        return (o["propertyDetail"] && o["propertyDetail"]["corporateSortOrder"]) || "";
                    }
                ],
                ["asc"]
            );

            return orderByCorporate;
        }
    }

    @computed
    get getDefaultRegion() {
        const destinations = getDestination();
        const currentDestination = destinations.find(
            item => item.propertyId.indexOf(this.filters.get("selectedPropertyId")) > -1
        );
        const selectedRegion = this.filters.get("selectedRegion");

        if (currentDestination) {
            return currentDestination.regionName;
        } else if (!currentDestination && selectedRegion) {
            return selectedRegion;
        } else {
            return (destinations[0] && destinations[0].regionName) || "";
        }
    }

    @computed
    get getOffers() {
        return this.RoomOffersData || [];
    }

    @action
    setActiveRegion(regionName = this.getDefaultRegion) {
        !regionName && (regionName = this.getDefaultRegion);
        this.activeRegion = regionName;
        if ((this.activeComponent === SELECT_RESORT || this.activeComponent === RESORT_AND_DATE) && this.activeRegion) {
            this.filters.set("selectedRegion", this.activeRegion);
            analytics.updateAnalytics(
                { step: "2", region: this.activeRegion, resorts: this.getResortsByRegion },
                "resorts"
            );
            this.history.replace(URL_QUESTION_MARK + this.searchUrl);
        }
    }

    getSubPropertiesByRegion(regionName) {
        const destinations = getDestination();
        const destination = destinations.find(destination => destination.regionName === regionName);

        return (destination && destination.propertyId) || [];
    }

    @computed
    get getSelectedRoom() {
        return this.selectedRooms && this.selectedRooms.length && this.selectedRooms[0];
    }

    @computed
    get getResortsByRegion() {
        const subProperties = this.getSubPropertiesByRegion(this.activeRegion);
        const resorts = [];

        subProperties.map(subPropertyId => {
            this.resorts.map(resort => {
                resort.propertyDetail.id === subPropertyId ? resorts.push(resort) : "";
            });
        });
        return resorts;
    }

    @action
    setSelectedPropertyName(selectedPropObj = null) {
        if (selectedPropObj) {
            this.locationPropertyName = selectedPropObj.propertyDetail.propName;
            this.selectedPropertyName = selectedPropObj.propertyDetail.propName;
            this.cabanasBookingPhoneNumber = selectedPropObj.propertyDetail.cabanasBookingPhoneNumber;
        }
    }

    @action
    getListCallData(filters = {}, data = {}) {
        const serviceUrl = services["roomList"];
        const _this = this;
        let defaults = {
                maximumNumberOfReservations: getMaxRooms(),
                maxTripDuration: this.filters.get("maxTripDuration"),
                partialOffer: false
            },
            prevPromoCode = this.filters.get("prevPromoCode"),
            promoCode = this.filters.get("promoCode"),
            prevProgramId = this.filters.get("prevProgramId") || "",
            programId = this.filters.get("programId") || "",
            bar = this.filters.get("bar"),
            selectedRoomId = this.filters.get("selectedRoomId"),
            urlPriceType = this.filters.get("urlPriceType"),
            partialOffer = this.filters.get("partialOffer"),
            iataCode = this.filters.get("iataCode");
        partialOffer ? (defaults.partialOffer = partialOffer) : null;
        promoCode ? (defaults.promoCode = promoCode) : null;
        defaults.programId = programId;
        defaults.prevProgramId = prevProgramId;

        if (prevPromoCode) {
            defaults.prevPromoCode = prevPromoCode;
        }

        if (this.editMode) {
            defaults.flow = "edit";
        }

        if (selectedRoomId) {
            defaults.selectedRoomId = selectedRoomId;
        }

        if (bar) {
            defaults.bar = bar;
        }

        if (iataCode) {
            defaults.agentId = iataCode;
        }

        if (isNonPerpetual()) {
            defaults.nonPerpetual = true;
        }

        urlPriceType ? (defaults.urlPriceType = urlPriceType) : "";

        _this.responseErrors = "";

        defaults.programId = _this.validateProgramId(defaults.programId, data);

        filters = Object.assign(defaults, filters);

        const params = this.parseQueryParams(filters);

        if (!params.checkInDate && !params.checkOutDate) {
            this.invalidTripDates = true;
            return;
        } else {
            this.invalidTripDates = false;
        }

        this.dataRequest(
            serviceUrl,
            {
                id: "roomList",
                params,
                loadAnim: true,
                beforeSend: () => {
                    _this.roomErrors = "";
                    this.roomList = {};
                },
                onComplete: (req, res, err) => {
                    if (req) {
                        this.filters.set("partialOffer", req.partialOffer);
                        if (!params.checkInDate && !params.checkOutDate && (params.programId || params.promoCode)) {
                            this.filters.set("arrive", parseDate(req.checkInDate, "m/d/y", "y-m-d"));
                            this.filters.set("depart", parseDate(req.checkOutDate, "m/d/y", "y-m-d"));
                            this.history.replace(URL_QUESTION_MARK + this.searchUrl);
                        }
                    }

                    this.roomList = res;
                    data.onComplete && data.onComplete(req, res, err);
                }
            },
            (response, errors) => {
                _this.roomErrors = errors || null;
                if (response.partialOffer) {
                    this.updateOfferBestPriceWarning(true);
                } else {
                    this.updateOfferBestPriceWarning(false);
                }

                let responseResorts = response.resorts || [];
                this.segmentOfferResorts = responseResorts;

                _this.cabanasBookingPhoneNumber = null;
                const selectedPropObj = responseResorts.find(
                    val => val.propertyDetail && val.propertyDetail.id === params.selectedPropertyId
                );

                _this.setSelectedPropertyName(selectedPropObj);
                if (isEnableAllProperty()) {
                    _this.setActiveRegion(this.activeRegion);
                }

                _this.propertyDetail = response.propertyDetail || {};
                _this.adaRooms = response.adaRooms || [];
                _this.rooms = response.rooms || [];
                _this.reservationWindow = response.reservationWindow;
                _this.selectedRoom = response.selectedRoom || {};
                if (response.selectedRoom) {
                    _this.selectedRooms = [response.selectedRoom];
                } else {
                    _this.selectedRooms = [];
                }

                _this.totalNights = response.totalNights;
                _this.offerDetails = response.offer || {};
                _this.offer = response.offer || {};

                if (response.offer) {
                    this.propertyOfferMap.set(params.selectedPropertyId, response.offer);
                }

                _this.isPerpetualOfferApplied = (response.offer && response.offer.isPerpetualOffer) || false;
                if (
                    response.offer &&
                    response.offer.isPerpetualOffer &&
                    response.offer.programId &&
                    !isNonPerpetual()
                ) {
                    this.filters.set("programId", response.offer.programId);
                    this.history.push(URL_QUESTION_MARK + this.searchUrl);
                }

                if (response.offer && response.offer.offerType == "segment") {
                    _this.isSegmentOffer = true;
                    this.updateSegmentOffer(response, programId, params.selectedPropertyId);
                } else {
                    _this.isSegmentOffer = false;
                }

                _this.isOfferApplied = response.offer ? true : false;
                _this.currentDateFlag = response.currentDateFlag ? true : false;

                if (_this.isCabana && _this.globalWarnings && _this.globalWarnings["code"] === "_same_day") {
                    _this.globalWarnings = {};
                }

                _this.updateAnalyticsData(response);
                if (this.activeComponent === ROOM_LISTING) {
                    this.checkAvailableRooms();
                }
            }
        );
    }

    updateSegmentOffer(response, programId, selectedPropertyId) {
        let segmentOffer;
        segmentOffer = response.resorts.find(item => {
            return item.programId === programId;
        });
        if (!segmentOffer && isEnableAllProperty()) {
            segmentOffer = response.resorts.find(item => {
                return (
                    programId &&
                    item.segmentId === programId &&
                    (selectedPropertyId ? item.propertyId === selectedPropertyId : true)
                );
            });
        }

        if (segmentOffer) {
            this.segmentOffer = segmentOffer;
        }
    }

    @action
    roomListInit(response) {
        if (
            response &&
            response.offer &&
            response.offer.ccmType === "segments" &&
            !response.rooms &&
            !response.adaRooms
        ) {
            this.changeView(SELECT_RESORT);
        }
    }

    @action
    getRoomOffersList(regionFilter) {
        let id = "offers",
            _this = this,
            apiUrl = services[id],
            defaults = {
                numOffers: getNumOffers(),
                propertyId: _this.filters.get("propertyId"),
                selectedPropertyId: isEnableAllProperty() ? _this.filters.get("selectedPropertyId") : singlePropertyId()
            };

        if (isEnableAllProperty()) {
            defaults.regionFilter = regionFilter ? regionFilter : this.filters.get("regionFilter");
        }

        _this.dataRequest(
            apiUrl,
            {
                id,
                params: defaults,
                loadAnim: false,
                customLoader: () => {
                    _this.isLoading = true;
                }
            },
            res => {
                _this.isLoading = false;
                _this.RoomOffersData = res && res.filter(item => !item.offer.error);
            }
        );
    }

    getDatesAnalyticsParam() {
        return {
            step: "1",
            offer: this.offer,
            guests: this.filters.get("numAdults")
        };
    }

    getResortsAnalyticsParam() {
        return {
            step: "2",
            type: "room",
            region: this.activeRegion,
            guests: this.filters.get("numAdults"),
            nights: this.getNights(),
            arrivalDate: formatDateString(this.filters.get("arrive"), "MM/DD/YYYY"),
            departureDate: formatDateString(this.filters.get("depart"), "MM/DD/YYYY"),
            offer: this.offer,
            resorts: this.getResortsByRegion,
            reservationWindow: this.reservationWindow,
            isCabana: this.isCabana
        };
    }

    getRoomsAnalyticsParam() {
        return {
            step: "2",
            type: "room",
            region: this.activeRegion,
            guests: this.filters.get("numAdults"),
            nights: this.getNights(),
            reservationWindow: this.reservationWindow,
            arrivalDate: formatDateString(this.filters.get("arrive"), "MM/DD/YYYY"),
            departureDate: formatDateString(this.filters.get("depart"), "MM/DD/YYYY"),
            offer: this.offer,
            roomList: this.roomList,
            isCabana: this.isCabana
        };
    }

    getNights() {
        if (this.filters.get("arrive") && this.filters.get("depart"))
            return datediff(this.filters.get("arrive"), this.filters.get("depart"), "y-m-d");
    }

    updateAnalyticsData(response) {
        if (this.activeComponent === SELECT_RESORT) {
            analytics.updateAnalytics(
                {
                    step: "2",
                    type: "room",
                    region: this.activeRegion,
                    guests: this.filters.get("numAdults"),
                    nights: this.getNights(),
                    reservationWindow: response.reservationWindow,
                    arrivalDate: formatDateString(this.filters.get("arrive"), "MM/DD/YYYY"),
                    departureDate: formatDateString(this.filters.get("depart"), "MM/DD/YYYY"),
                    offer: this.offer,
                    resorts: this.getResortsByRegion,
                    isCabana: this.isCabana
                },
                "resorts"
            );
        } else if (this.activeComponent === ROOM_LISTING) {
            analytics.updateAnalytics(
                {
                    step: "2",
                    type: "room",
                    region: this.activeRegion,
                    guests: this.filters.get("numAdults"),
                    nights: this.getNights(),
                    reservationWindow: response.reservationWindow,
                    arrivalDate: formatDateString(this.filters.get("arrive"), "MM/DD/YYYY"),
                    departureDate: formatDateString(this.filters.get("depart"), "MM/DD/YYYY"),
                    offer: this.offer,
                    roomList: response,
                    isCabana: this.isCabana
                },
                "room"
            );
        } else if (this.activeComponent === SELECT_DATE) {
            analytics.updateAnalytics(this.getDatesAnalyticsParam(), "calendar");
        }
    }

    @action
    toggleSignInModel(clickedRoomTypeId, action) {
        if (action === "show") {
            this.showSignInModel = true;
            this.filters.set("clickedRoomTypeId", clickedRoomTypeId);
        } else if (action === "hide") {
            this.showSignInModel = false;
            this.filters.set("clickedRoomTypeId", null);
        }
    }

    @action
    getRoomData(roomTypeId, joinWhileBook) {
        let defaults = {
                selectedRoomTypeId: roomTypeId,
                pointsFlow: false,
                partialOffer: false,
                defOfferFlag: false
            },
            bar = this.filters.get("bar"),
            promoCode = this.filters.get("promoCode"),
            programId = this.filters.get("programId");

        if (promoCode) {
            defaults.promoCode = promoCode;
        }

        if (programId) {
            defaults.programId = programId;
        }

        if (bar) {
            defaults.bar = bar;
        }

        if (joinWhileBook) {
            defaults.joinWhileBook = joinWhileBook;
        }

        if (this.editingRoom && this.editingRoom.oldReservationId) {
            defaults.oldReservationId = this.editingRoom.oldReservationId;
        }

        if (this.editingRoom && this.editingRoom.oldRoomProgramId) {
            defaults.oldProgramId = this.editingRoom.oldRoomProgramId;
            defaults.oldRoomProgramId = this.editingRoom.oldRoomProgramId;
        }

        if (this.editMode) {
            defaults.flow = "edit";
        }

        return this.parseQueryParams(defaults);
    }

    @action
    bookRoom(roomTypeId, isMember, redirect = true) {
        let id = "bookRoom",
            serviceUrl = services[id],
            urls = getURLs(),
            params;

        if (this.currentDateFlag && this.isCabana) {
            const cabanaBookingPhoneErrorMessage = cabanaBookingPhoneError.replace(
                "{cabanasBookingPhoneNumber}",
                this.cabanasBookingPhoneNumber
            );

            this.globalWarnings = { code: "_same_day", message: cabanaBookingPhoneErrorMessage };
            return;
        }

        params = this.getRoomData(roomTypeId, isMember);
        this.dataRequest(serviceUrl, { id, params, loadAnim: true }, (res, err) => {
            if (!err) {
                sessionManager.setObject("booked-room", params);
                sessionManager.removeItem("editingRoom");
                redirect ? (window.location.href = urls.booking.reserve) : window.location.reload(true);
            }
        });
    }

    @action
    roomDetailRequest(data, callback = null) {
        let id = `roomDetail`,
            selectedPropertyId = this.isCabana
                ? data.cabanaPropertyId
                : isEnableAllProperty()
                ? this.filters.get("selectedPropertyId")
                : this.filters.get("propertyId"),
            serviceUrl = String(services[id]);
        serviceUrl = serviceUrl.replace("{roomTypeId}", data.roomTypeId).replace("{propertyId}", selectedPropertyId);
        this.dataRequest(serviceUrl, { id: id + serviceUrl }, callback);
    }

    @action
    handleSiginRequest(query, callback) {
        const serviceUrl = getAccountSignInService();

        this.dataRequest(serviceUrl, { id: "signIn", params: query, loadAnim: true }, (res, errors) => {
            this.responseErrors = [];
            if (callback) {
                callback(res, errors);
            }
        });
    }

    isRequestWithSameParams(prevParams = {}, currentParams, ignoreParams) {
        const previous = Object.assign({}, prevParams);
        const current = Object.assign({}, currentParams);

        if (ignoreParams) {
            ignoreParams.map(param => {
                delete previous[param];
                delete current[param];
            });
        }

        return isequal(previous, current);
    }

    @action
    viewAvailableDates(selectedPropertyId, selectedPropertyName) {
        let route = this.routes.find(val => val.component === ROOM_LISTING),
            routeToNavigate = this.routes.find(val => val.component === SELECT_DATE);
        if (route) {
            this.filters.set("selectedPropertyId", selectedPropertyId);
            this.selectedPropertyName = selectedPropertyName;
            this.history.push(routeToNavigate.url + URL_QUESTION_MARK + this.searchUrl);
        }
    }

    @action
    switchResortCrossProperty(property) {
        let selectedResort =
            this.segmentOfferResorts.length > 0 &&
            this.segmentOfferResorts.find(item => item.propertyId === property.id);
        let programId =
            selectedResort && selectedResort.programId
                ? selectedResort.programId
                : selectedResort && this.filters.get("segmentId")
                ? this.filters.get("segmentId")
                : null;
        if (this.viewport !== "xlarge") {
            this.toggleCrossPropertyOffCanvas(false);
        }

        this.filters.set("selectedPropertyId", property.id);
        this.defaultFilters.set("selectedPropertyId", property.id);
        this.locationPropertyName = property.propName;
        this.selectedPropertyName = property.propName;
        selectedResort && programId
            ? (this.filters.set("programId", programId), this.filters.set("propertyProgramId", programId))
            : null;
        this.history.replace(URL_QUESTION_MARK + this.searchUrl);
        this.clearRoomFilters();
        if (this.isScaffoldingRefresh) {
            this.applyRoomFilterDeepLink();
        }

        analytics.updateCrosspropertySelection(property.id);
        if (isEnableAllProperty() && this.offer && !this.offer.ccmType) {
            this.removeOffer(false);
        } else {
            !programId ? this.getListCallData() : this.getListCallData({ programId: programId });
        }
    }

    @action
    dataRequest(apiUrl, data, callback, errorCallback) {
        const params = data && data.params ? data.params : null;
        const ignoreParams = (data && data.ignoreParams) || null;
        const isPending = this.prevParams.get(data.id + "__isPending");
        const prevQueryParams = this.prevParams.get(data.id + "__params");
        let jsonCall;
        if (
            (isPending || (params && this.isRequestWithSameParams(prevQueryParams, params, ignoreParams))) &&
            !data.serviceReqBlockedCallback
        ) {
            return;
        }

        if (apiUrl) {
            if (data.beforeSend) {
                data.beforeSend();
            }

            this.prevParams.set(data.id + "__isPending", true);

            if (data.loadAnim) {
                !data.disableScrollToTop ? window.scrollTo(0, 0) : "";
                loader.setLoader();
            } else if (data.enableLoaderOverlay) {
                this.enableOverlayLoader(data.enableLoaderOverlay);
            } else if (data.enableComponentLoaderOverLay) {
                this.enableComponentOverlayLoader(data.enableComponentLoaderOverLay);
            }

            if (data.customLoader) {
                data.customLoader();
            }

            if (!params) {
                jsonCall = axios.get(apiUrl);
            } else {
                const query = typeof params === "string" ? params : querystring.stringify(params);

                jsonCall = axios.post(apiUrl, query);
            }

            jsonCall.then(
                action(res => {
                    this.prevParams.set(data.id + "__isPending", false);
                    this.prevParams.set(data.id + "__params", params);
                    if (data.loadAnim) {
                        loader.removeLoader();
                    } else if (data.enableLoaderOverlay) {
                        this.disableLoaderOverlay();
                    } else if (data.enableComponentLoaderOverLay) {
                        this.disableComponentLoaderOverlay(data.enableComponentLoaderOverLay);
                    }

                    const errorResponse = res.data.messages;

                    if (errorResponse) {
                        if (!data.disableGlobalError) {
                            this.responseErrors = errorResponse;
                        }

                        this.prevParams.set(data.id + "__errors", errorResponse);
                        if (
                            this.responseErrors &&
                            this.responseErrors[0] &&
                            this.responseErrors[0].code === "_single_use_offer" &&
                            data.id !== "bookRoom"
                        ) {
                            this.openErrorModal("_single_use_offer");
                            this.removeProgramId();
                            this.responseErrors = null;
                        }

                        if (errorCallback) {
                            errorCallback(errorResponse);
                        }
                    } else {
                        if (!data.disableGlobalError) {
                            this.responseErrors = null;
                        }

                        this.prevParams.delete(data.id + "__errors");
                    }

                    if (data.onComplete) {
                        const request = res.data.request || {};
                        const response = res.data.response || {};

                        data.onComplete(request, response, errorResponse);
                    }

                    if (callback) {
                        const response = res.data.response || {};
                        const request = res.data.request || {};

                        callback(response, errorResponse, request);
                    }

                    this.sessionStore && this.sessionStore.resetSession();
                })
            );
        }
    }
}

export default new BookingRoomStore();
