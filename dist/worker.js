/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/SimulationWorker.ts":
/*!*********************************!*\
  !*** ./src/SimulationWorker.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const Simulation_1 = __webpack_require__(/*! ./logic/Simulation */ "./src/logic/Simulation.ts");
const simulationSerialization_1 = __webpack_require__(/*! ./logic/simulationSerialization */ "./src/logic/simulationSerialization.ts");
const maxSimulationRuns = 100000000;
const graphicsUpdateInterval = 100000;
let exactnesThreshold = 0.0001;
let resolution = 0.1;
let lastArray = null;
function isConfig(data) {
    if (data.resolution) {
        return true;
    }
    return false;
}
onmessage = (ev) => {
    if (simulationSerialization_1.isSimulationSerialization(ev.data)) {
        const simulation = simulationSerialization_1.revive(ev.data);
        const results = [];
        for (let i = 1; i < maxSimulationRuns; i++) {
            results.push(simulation.simulateOnce());
            if (i % graphicsUpdateInterval == 0) {
                const processed = simulation.processSimulationResults(results);
                const array = Simulation_1.Simulation.toArray(processed, resolution, simulation.lastDate.getTime());
                const message = {
                    array: array,
                    persons: simulation.personArray.map(person => person.name)
                };
                const ctx = self;
                ctx.postMessage(message);
                if (lastArray) {
                    //check for difference and break if small enough
                    let difference = 0;
                    for (let i = 0; i < lastArray.length; i++) {
                        const datapoint = array[i];
                        const lastDatapoint = lastArray[i];
                        for (let j = 0; j < datapoint.values.length; j++) {
                            difference += Math.abs(datapoint.values[j] - lastDatapoint.values[j]);
                        }
                    }
                    difference /= lastArray.length * lastArray[0].values.length;
                    console.log(difference);
                    if (difference < exactnesThreshold) {
                        return;
                    }
                }
                lastArray = array;
            }
        }
    }
    else if (isConfig(ev.data)) {
        resolution = ev.data.resolution;
        exactnesThreshold = ev.data.accuracy;
    }
};


/***/ }),

/***/ "./src/logic/Contact.ts":
/*!******************************!*\
  !*** ./src/logic/Contact.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Contact = void 0;
/**
 * @class
 * @property {number?} intensity - Probability of infecting the other one
 * @property {Date?} date
 */
class ContactOptions {
    constructor() {
        this.intensity = 0.5;
        this.date = new Date();
    }
}
/**
 * @class
 * @extends {ContactOptions}
 */
class Contact extends ContactOptions {
    /**
     *
     * @param {Person} a
     * @param {Person} b
     * @param {ContactOptions} options
     */
    constructor(a, b, options) {
        super();
        this.a = a;
        this.b = b;
        Object.assign(this, options);
    }
    process() {
    }
}
exports.Contact = Contact;


/***/ }),

/***/ "./src/logic/Person.ts":
/*!*****************************!*\
  !*** ./src/logic/Person.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Person = void 0;
const defaultContactGenerator = (date, person) => ({
    date: new Date(date.getTime() + 2 * Math.random() * 1000 * 60 * 60 * 24 / person.untrackedFrequency),
    acuteInfected: 0.001 > Math.random(),
    everInfected: 0.01 > Math.random(),
    intensity: 2 * Math.random() * person.untrackedIntensity,
    person: person
});
/**
 * Class representing persons in the real world.
 */
class Person {
    /**
     * @param {string} name
     * @param {untrackedContactGenerator} externalActivity - generates next contact of person starting at given date
     */
    constructor(name, untrackedFrequency = 1, untrackedIntensity = 0.1, externalActivity = defaultContactGenerator) {
        this.externalActivity = externalActivity;
        this.name = name;
        this.untrackedFrequency = untrackedFrequency;
        this.untrackedIntensity = untrackedIntensity;
    }
}
exports.Person = Person;


/***/ }),

/***/ "./src/logic/Simulation.ts":
/*!*********************************!*\
  !*** ./src/logic/Simulation.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Simulation = exports.isUntracked = void 0;
const Virus_1 = __webpack_require__(/*! ./Virus */ "./src/logic/Virus.ts");
const Test_1 = __webpack_require__(/*! ./Test */ "./src/logic/Test.ts");
const constants_1 = __webpack_require__(/*! ./constants */ "./src/logic/constants.ts");
function isUntracked(contact) {
    return contact.person != null;
}
exports.isUntracked = isUntracked;
/**
 * Simulation of an infection. Provides the functionality to simulate the plot many times to approximate probabilities at given test results
 */
class Simulation {
    constructor(initialDate = new Date(), observations = []) {
        this.observations = observations;
        this.initialDate = initialDate;
        this.lastDate = initialDate;
        /**@type {Set<Person>}*/
        this.persons = new Set();
        /** @type {Contact[]} */
        this.contacts = [];
        /**
         * Assigns a function to each person which generates an initial infection date (or null if no infection happened)
         * @type {Map<Person,()=>Date?}
         */
        this.personToInitialInfectionDate = new Map();
    }
    /**
     *
     * @param {Person} person
     * @param {()=>Date?} dateGenerator -function which generates an initial infection date (or null if no infection happened)
     */
    setInfectionDateFunction(person, dateGenerator) {
        this.personToInitialInfectionDate.set(person, dateGenerator);
    }
    /**@param {Person} toAdd */
    addPerson(toAdd) {
        this.persons.add(toAdd);
        this.personToInitialInfectionDate.set(toAdd, () => {
            if (Math.random() < 0.01) {
                return new Date(this.initialDate.getTime() - Math.random() * 100 * constants_1.algorithmicConstants.dayToMS); //random day in the last 100 days
            }
            return null;
        });
    }
    /** @param {Contact} toAdd - contact to be added to the procession list */
    addContact(toAdd) {
        for (let i = 0; i < this.contacts.length; i++) {
            if (toAdd.date.getTime() < this.contacts[i].date.getTime()) {
                this.contacts.splice(i, 0, toAdd);
                this.persons.add(toAdd.a);
                this.persons.add(toAdd.b);
                return;
            }
        }
        this.contacts.push(toAdd);
        this.addPerson(toAdd.a);
        this.addPerson(toAdd.b);
        if (this.lastDate < toAdd.date)
            this.lastDate = toAdd.date;
    }
    /**order contacts to avoid any errors */
    refreshContacts() {
        this.contacts.sort((a, b) => a.date.getTime() - b.date.getTime());
        if (this.contacts.length > 0) {
            const newLastDate = this.contacts[this.contacts.length - 1].date;
            if (newLastDate > this.lastDate)
                this.lastDate = newLastDate;
        }
        for (let o of this.observations) {
            if (o instanceof Test_1.Test && o.date && o.date > this.lastDate) {
                this.lastDate = o.date;
            }
        }
        if (this.contacts.length > 0 && this.initialDate > this.contacts[0].date) {
            this.initialDate = this.contacts[0].date;
        }
    }
    simulateOnce() {
        const lastDateToSimulate = this.lastDate;
        /**
         * @type {Map<Person,Date>}
         */
        const result = new Map();
        /**@type {UntrackedContact|Contact)[]} */
        const events = new Array(...this.contacts);
        /**@type {(contact:import("./Person.js").UntrackedContact)=>void} */
        const addUntrackedContact = (constact) => {
            const date = constact.date;
            for (let i in events) {
                if (events[i].date > date) {
                    events.splice(Number.parseInt(i), 0, constact);
                    return;
                }
            }
            events.push(constact);
        };
        for (let person of this.persons) {
            const initialDate = this.personToInitialInfectionDate.get(person)();
            result.set(person, initialDate);
            for (let contact = person.externalActivity(this.initialDate, person); contact.date < lastDateToSimulate; contact = person.externalActivity(contact.date, person)) {
                if (contact.acuteInfected)
                    addUntrackedContact(contact);
            }
        }
        for (let contact of events) {
            if (isUntracked(contact)) {
                //contact is untracked. This is only triggered if the other person is infected
                if (!result.get(contact.person) && Math.random() < contact.intensity) {
                    result.set(contact.person, contact.date);
                }
                continue;
            }
            //contact is tracked
            const aDate = result.get(contact.a);
            const bDate = result.get(contact.b);
            // if both or none is infected nothing happens
            if (aDate && bDate || !aDate && !bDate)
                continue;
            if (aDate) {
                const probabilityOfInfection = contact.intensity * Virus_1.Virus.getProbabilityOfInfectiousness(aDate, contact.date);
                if (Math.random() < probabilityOfInfection) {
                    result.set(contact.b, contact.date);
                }
            }
            if (bDate) {
                const probabilityOfInfection = contact.intensity * Virus_1.Virus.getProbabilityOfInfectiousness(bDate, contact.date);
                if (probabilityOfInfection <= 0)
                    continue;
                if (Math.random() < probabilityOfInfection) {
                    result.set(contact.a, contact.date);
                }
            }
        }
        let probability = 1;
        for (let observation of this.observations) {
            probability *= observation.getProbability(result.get(observation.person));
        }
        return {
            probability: probability,
            result: result
        };
    }
    processSimulationResults(results) {
        let probabilitySum = 0;
        for (let result of results)
            probabilitySum += result.probability;
        /**@type {Map<Person,number>} */
        const totalInfectionProbability = new Map();
        for (let person of this.persons) {
            totalInfectionProbability.set(person, 0);
        }
        /**@type {Map<Person,{date:Date,p:number, pAcc:number?}[]>} */
        const infectionDates = new Map();
        for (let person of this.persons)
            infectionDates.set(person, []);
        for (let result of results) {
            const realProb = result.probability / probabilitySum;
            for (let person of this.persons) {
                if (result.result.get(person))
                    totalInfectionProbability.set(person, totalInfectionProbability.get(person) + realProb);
                infectionDates.get(person).push({ date: result.result.get(person), p: realProb, pAcc: null });
            }
        }
        for (let person of this.persons) {
            const infectionDatesPerson = infectionDates.get(person);
            infectionDatesPerson.sort((a, b) => {
                if (!a.date && !b.date)
                    return 0;
                if (!a.date)
                    return 1;
                if (!b.date)
                    return -1;
                return a.date.getTime() - b.date.getTime();
            });
            let accumulatedProb = 0;
            for (let date of infectionDatesPerson) {
                accumulatedProb += date.p;
                date.pAcc = accumulatedProb;
            }
        }
        return {
            initialDate: this.initialDate,
            totalInfectionProbability: totalInfectionProbability,
            infectionTimeline: infectionDates
        };
    }
    simulate(runs) {
        const results = [];
        for (let i = 0; i < runs; i++) {
            const result = this.simulateOnce();
            results.push(result);
        }
        return this.processSimulationResults(results);
    }
    /**
     * computes an array representation of the simulation results
     * @param result -simulation result object
     * @param resolution - number of datapoints to show per day
     * @param lastDate - last date to simulate in ms from 1970
     */
    static toArray(result, resolution, lastDate) {
        const personArray = new Array(...result.infectionTimeline.keys());
        const list = [];
        const indices = personArray.map((person) => 0);
        for (let date = result.initialDate; date.getTime() < lastDate; date = new Date(date.getTime() + resolution * 1000 * 60 * 60 * 24)) {
            const newValues = new Array(personArray.length);
            for (let i = 0; i < personArray.length; i++) {
                const person = personArray[i];
                const personValues = result.infectionTimeline.get(person);
                let index = indices[i];
                while (index + 1 < personValues.length && personValues[index + 1].date && personValues[index + 1].date < date)
                    index++;
                indices[i] = index;
                newValues[i] = personValues[index].pAcc;
            }
            list.push({ date: date, values: newValues });
        }
        return list;
    }
    /**returns the persons as array to be able to use Array.map etc */
    get personArray() {
        return new Array(...this.persons);
    }
}
exports.Simulation = Simulation;


/***/ }),

/***/ "./src/logic/Test.ts":
/*!***************************!*\
  !*** ./src/logic/Test.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SymptomLog = exports.Test = exports.Observation = void 0;
const Virus_1 = __webpack_require__(/*! ./Virus */ "./src/logic/Virus.ts");
const constants_1 = __webpack_require__(/*! ./constants */ "./src/logic/constants.ts");
class Observation {
    /**
     *
     * @param {Person} person
     */
    constructor(person) {
        this.person = person;
    }
    /**
     *
     * @param {Date?} dateOfInfection - date at which an infection occurs or null when it does not occur
     * @returns {number} probability that this observation occurs given an invection
     */
    getProbability(dateOfInfection) {
        return -1;
    }
}
exports.Observation = Observation;
/**
 * @typedef {Object} TestOptions
 * @property {number} sensitivity
 * @property {number} specificity
 * @property {number} timeT
 */
/**
 * @class
 */
class Test extends Observation {
    /**
     * @param {Person} person
     * @param {Date} date - date of the test
     * @param {boolean} positive - true if the result is positive
     */
    constructor(person, date, positive, sensitivity = 0.95, specificity = 0.9, startObservability = 2, endObservability = 14) {
        super(person);
        this.setDate(date);
        this.startObservability = startObservability;
        this.endObservability = endObservability;
        this.positive = positive;
        this.sensitivity = sensitivity;
        this.specificity = specificity;
    }
    setDate(date = this.date) {
        this.date = date;
        this.relevantTimeStart = new Date(date);
        this.relevantTimeStart.setDate(date.getDate() - this.endObservability);
        this.relevantTimeEnd = new Date(date);
        this.relevantTimeEnd.setDate(date.getDate() - this.startObservability);
    }
    /**
     *
     * @param {Date?} dateOfInfection - date at which an infection occurs or null when it does not occur
     * @returns {number} probability that this observation occurs given an invection
     */
    getProbability(dateOfInfection) {
        if (dateOfInfection && dateOfInfection > this.relevantTimeStart && dateOfInfection < this.relevantTimeEnd) {
            //infected
            return this.positive ? this.sensitivity : 1 - this.specificity;
        }
        //not infected
        return this.positive ? (1 - this.specificity) : this.sensitivity;
    }
}
exports.Test = Test;
/**
 * A log of the symptoms a person has. Note that a log MUST contain ALL logs about one person!
 */
class SymptomLog extends Observation {
    /**
     * @param {Person} person
     * @param {Map<Date,number>} log - maps dates strength of covid-specific symptoms of the person at that date. ONLY ONE REPORT PER DAY ALLOWED!!!
     */
    constructor(person, log) {
        super(person);
        this.log = log;
        /**@type {Date[]} */
        this.dates = new Array(...this.log.keys());
        this.dates.sort();
        this.minDate = this.dates[0];
        this.maxDate = this.dates[this.dates.length - 1];
    }
    /**
     *
     * @param {Date?} dateOfInfection - date at which an infection occurs or null when it does not occur
     * @returns {number} probability that this observation occurs given an invection
     */
    getProbability(dateOfInfection) {
        let virusReportRate = 0;
        let infectionMatching = Virus_1.Virus.noSymptomProbability; //how much the infection matches with the report days
        if (dateOfInfection) {
            //infected
            const firstRelevantDay = new Date(dateOfInfection.getTime() + Virus_1.Virus.incubationTime * constants_1.algorithmicConstants.dayToMS);
            const lastRelevantDay = new Date(dateOfInfection.getTime() + Virus_1.Virus.endOfInfectiosness * constants_1.algorithmicConstants.dayToMS);
            const relevantReportDays = this.dates.filter((date) => firstRelevantDay <= date && date <= lastRelevantDay); //reports in infection timeframe
            for (let relevantReportDay of relevantReportDays) {
                infectionMatching = 1 - (1 - infectionMatching) * (1 - this.log.get(relevantReportDay) / relevantReportDays.length);
            }
            infectionMatching = relevantReportDays.length / Virus_1.Virus.endOfInfectiosness;
        }
        //not infected
        let averageIllness = 0;
        for (let dayLog of this.log) {
            averageIllness += dayLog[1];
        }
        averageIllness /= this.log.size;
        return virusReportRate * infectionMatching + (1 - virusReportRate) * (0.9 - 0.8 * averageIllness); //0.9 if no symptoms, 0.1 if total symptoms
    }
}
exports.SymptomLog = SymptomLog;


/***/ }),

/***/ "./src/logic/Virus.ts":
/*!****************************!*\
  !*** ./src/logic/Virus.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Virus = void 0;
class Virus {
    /**
     *
     * @param {PersonLog} log
     * @param {Date} date - date to get probability from
     * @returns {number} - probability of being infected and able to spread the virus at that date
     */
    static getAcuteInfectionProbability(log, date) {
        const startInfectionPeriod = new Date(date);
        startInfectionPeriod.setDate(date.getDate() - Virus.endOfInfectiosness);
        const endInfectionPeriod = new Date(date);
        endInfectionPeriod.setDate(date.getDate() - Virus.startOfInfectiosness);
        return log.getInfectionProbability(endInfectionPeriod) - log.getInfectionProbability(startInfectionPeriod);
    }
    static getProbabilityOfInfectiousness(infectionDate, currentDate) {
        const startInfectionPeriod = new Date(infectionDate);
        startInfectionPeriod.setDate(infectionDate.getDate() + Virus.startOfInfectiosness);
        const endInfectionPeriod = new Date(infectionDate);
        endInfectionPeriod.setDate(infectionDate.getDate() + Virus.endOfInfectiosness);
        return (startInfectionPeriod < currentDate && currentDate < endInfectionPeriod) ? 1 : 0;
    }
}
exports.Virus = Virus;
/** days after infection when you start being infectious */
Virus.startOfInfectiosness = 2;
/** days after infection when you stop being infectious */
Virus.endOfInfectiosness = 10;
/**days after first symptoms occur */
Virus.incubationTime = 5.5;
/**probability of not having any symptoms with the virus */
Virus.noSymptomProbability = 0.55;


/***/ }),

/***/ "./src/logic/constants.ts":
/*!********************************!*\
  !*** ./src/logic/constants.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.algorithmicConstants = void 0;
exports.algorithmicConstants = {
    deltaT: 0.1,
    dayToMS: 1000 * 60 * 60 * 24
};


/***/ }),

/***/ "./src/logic/simulationSerialization.ts":
/*!**********************************************!*\
  !*** ./src/logic/simulationSerialization.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.tryParseString = exports.revive = exports.serializeSimulation = exports.isSimulationSerialization = exports.isTest = exports.SimulationSerialization = void 0;
const Contact_1 = __webpack_require__(/*! ./Contact */ "./src/logic/Contact.ts");
const Person_1 = __webpack_require__(/*! ./Person */ "./src/logic/Person.ts");
const Simulation_1 = __webpack_require__(/*! ./Simulation */ "./src/logic/Simulation.ts");
const Test_1 = __webpack_require__(/*! ./Test */ "./src/logic/Test.ts");
class SimulationSerialization {
}
exports.SimulationSerialization = SimulationSerialization;
function isTest(observation) {
    return observation.date !== null;
}
exports.isTest = isTest;
function isSimulationSerialization(serialization) {
    if (!serialization.persons)
        return false;
    const p = serialization.persons[0];
    if (p) {
        if (p.activityString)
            return true;
    }
    return false;
}
exports.isSimulationSerialization = isSimulationSerialization;
function serializeSimulation(simulation) {
    return {
        persons: simulation.personArray.map((person) => {
            return {
                name: person.name,
                untrackedFrequency: person.untrackedFrequency,
                untrackedIntensity: person.untrackedIntensity,
                activityString: person.externalActivity.toString()
            };
        }),
        contacts: simulation.contacts.map(contact => {
            return {
                a: contact.a.name,
                b: contact.b.name,
                date: contact.date,
                intensity: contact.intensity,
            };
        }),
        tests: simulation.observations.map((observation) => {
            if (isTest(observation)) {
                return {
                    type: "Test",
                    person: observation.person.name,
                    date: observation.date,
                    positive: observation.positive,
                    sensitivity: observation.sensitivity,
                    specificity: observation.specificity,
                    relevantTimeStart: observation.relevantTimeStart,
                    relevantTimeEnd: observation.relevantTimeEnd
                };
            }
            else {
                return {
                    type: "unknown"
                };
            }
        }),
        initialDate: simulation.initialDate,
        lastDate: simulation.lastDate
    };
}
exports.serializeSimulation = serializeSimulation;
function isTestSerialization(test) {
    return test.type == "Test";
}
function revive(serialization) {
    const sim = new Simulation_1.Simulation(serialization.initialDate);
    sim.lastDate = serialization.lastDate;
    for (let personSerialization of serialization.persons) {
        sim.addPerson(new Person_1.Person(personSerialization.name, personSerialization.untrackedFrequency, personSerialization.untrackedIntensity, eval(personSerialization.activityString)));
    }
    const personFromName = (name) => {
        for (let person of sim.persons)
            if (person.name == name) {
                return person;
            }
        return null;
    };
    for (let c of serialization.contacts) {
        sim.addContact(new Contact_1.Contact(personFromName(c.a), personFromName(c.b), {
            date: c.date,
            intensity: c.intensity
        }));
    }
    for (let ob of serialization.tests) {
        if (isTestSerialization(ob)) {
            const toAdd = new Test_1.Test(personFromName(ob.person), ob.date, ob.positive, ob.sensitivity, ob.specificity);
            toAdd.relevantTimeStart = ob.relevantTimeStart;
            toAdd.relevantTimeEnd = ob.relevantTimeEnd;
            sim.observations.push(toAdd);
        }
    }
    sim.refreshContacts();
    return sim;
}
exports.revive = revive;
const dateKeys = new Set(["date", "initialDate", "lastDate", "relevantTimeStart", "relevantTimeEnd"]);
function tryParseString(jsonString) {
    const parsed = JSON.parse(jsonString, (key, val) => {
        if (dateKeys.has(key))
            return new Date(val);
        return val;
    });
    if (isSimulationSerialization(parsed)) {
        const simulation = revive(parsed);
        return simulation;
    }
    return null;
}
exports.tryParseString = tryParseString;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__("./src/SimulationWorker.ts");
/******/ 	// This entry module used 'exports' so it can't be inlined
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9TaW11bGF0aW9uV29ya2VyLnRzIiwid2VicGFjazovL2Nvdmlkc2ltLy4vc3JjL2xvZ2ljL0NvbnRhY3QudHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvUGVyc29uLnRzIiwid2VicGFjazovL2Nvdmlkc2ltLy4vc3JjL2xvZ2ljL1NpbXVsYXRpb24udHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvVGVzdC50cyIsIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9sb2dpYy9WaXJ1cy50cyIsIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9sb2dpYy9jb25zdGFudHMudHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvc2ltdWxhdGlvblNlcmlhbGl6YXRpb24udHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vY292aWRzaW0vd2VicGFjay9zdGFydHVwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLGdHQUFnRDtBQUNoRCx1SUFBbUY7QUFFbkYsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUM7QUFDcEMsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLENBQUM7QUFDdEMsSUFBSSxpQkFBaUIsR0FBRyxNQUFNLENBQUM7QUFDL0IsSUFBSSxVQUFVLEdBQUcsR0FBRyxDQUFDO0FBQ3JCLElBQUksU0FBUyxHQUdBLElBQUksQ0FBQztBQUdsQixTQUFTLFFBQVEsQ0FBQyxJQUFTO0lBQ3ZCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUNqQixPQUFPLElBQUksQ0FBQztLQUNmO0lBQ0QsT0FBTyxLQUFLLENBQUM7QUFDakIsQ0FBQztBQUNELFNBQVMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFO0lBQ2YsSUFBSSxtREFBeUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDcEMsTUFBTSxV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QTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7O1VDckJBO1VBQ0E7VUFDQTtVQUNBIiwiZmlsZSI6Indvcmtlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBlcnNvbiB9IGZyb20gXCIuL2xvZ2ljL1BlcnNvblwiO1xuaW1wb3J0IHsgU2ltdWxhdGlvbiB9IGZyb20gXCIuL2xvZ2ljL1NpbXVsYXRpb25cIjtcbmltcG9ydCB7IGlzU2ltdWxhdGlvblNlcmlhbGl6YXRpb24sIHJldml2ZSB9IGZyb20gXCIuL2xvZ2ljL3NpbXVsYXRpb25TZXJpYWxpemF0aW9uXCJcblxuY29uc3QgbWF4U2ltdWxhdGlvblJ1bnMgPSAxMDAwMDAwMDA7XG5jb25zdCBncmFwaGljc1VwZGF0ZUludGVydmFsID0gMTAwMDAwO1xubGV0IGV4YWN0bmVzVGhyZXNob2xkID0gMC4wMDAxO1xubGV0IHJlc29sdXRpb24gPSAwLjE7XG5sZXQgbGFzdEFycmF5OiB7XG4gICAgZGF0ZTogRGF0ZTtcbiAgICB2YWx1ZXM6IG51bWJlcltdO1xufVtdIHwgbnVsbCA9IG51bGw7XG5cblxuZnVuY3Rpb24gaXNDb25maWcoZGF0YTogYW55KTogZGF0YSBpcyB7IHJlc29sdXRpb246IG51bWJlciAsIGFjY3VyYWN5Om51bWJlcn0ge1xuICAgIGlmIChkYXRhLnJlc29sdXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbm9ubWVzc2FnZSA9IChldikgPT4ge1xuICAgIGlmIChpc1NpbXVsYXRpb25TZXJpYWxpemF0aW9uKGV2LmRhdGEpKSB7XG4gICAgICAgIGNvbnN0IHNpbXVsYXRpb24gPSByZXZpdmUoZXYuZGF0YSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdHM6IHtcbiAgICAgICAgICAgIHByb2JhYmlsaXR5OiBudW1iZXI7XG4gICAgICAgICAgICByZXN1bHQ6IE1hcDxQZXJzb24sIERhdGU+O1xuICAgICAgICB9W10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBtYXhTaW11bGF0aW9uUnVuczsgaSsrKSB7XG4gICAgICAgICAgICByZXN1bHRzLnB1c2goc2ltdWxhdGlvbi5zaW11bGF0ZU9uY2UoKSk7XG4gICAgICAgICAgICBpZiAoaSAlIGdyYXBoaWNzVXBkYXRlSW50ZXJ2YWwgPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NlZCA9IHNpbXVsYXRpb24ucHJvY2Vzc1NpbXVsYXRpb25SZXN1bHRzKHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFycmF5ID0gU2ltdWxhdGlvbi50b0FycmF5KHByb2Nlc3NlZCwgcmVzb2x1dGlvbiwgc2ltdWxhdGlvbi5sYXN0RGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICAgICAgICAgICAgICAgIGFycmF5OiBhcnJheSxcbiAgICAgICAgICAgICAgICAgICAgcGVyc29uczogc2ltdWxhdGlvbi5wZXJzb25BcnJheS5tYXAocGVyc29uID0+IHBlcnNvbi5uYW1lKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBjdHg6IFdvcmtlciA9IHNlbGYgYXMgYW55O1xuICAgICAgICAgICAgICAgIGN0eC5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBpZiAobGFzdEFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY2hlY2sgZm9yIGRpZmZlcmVuY2UgYW5kIGJyZWFrIGlmIHNtYWxsIGVub3VnaFxuICAgICAgICAgICAgICAgICAgICBsZXQgZGlmZmVyZW5jZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhcG9pbnQgPSBhcnJheVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhc3REYXRhcG9pbnQgPSBsYXN0QXJyYXlbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGRhdGFwb2ludC52YWx1ZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmZXJlbmNlICs9IE1hdGguYWJzKGRhdGFwb2ludC52YWx1ZXNbal0gLSBsYXN0RGF0YXBvaW50LnZhbHVlc1tqXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGlmZmVyZW5jZSAvPSBsYXN0QXJyYXkubGVuZ3RoICogbGFzdEFycmF5WzBdLnZhbHVlcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRpZmZlcmVuY2UpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlmZmVyZW5jZSA8IGV4YWN0bmVzVGhyZXNob2xkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGFzdEFycmF5ID0gYXJyYXk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9ZWxzZSBpZihpc0NvbmZpZyhldi5kYXRhKSl7XG4gICAgICAgIHJlc29sdXRpb249ZXYuZGF0YS5yZXNvbHV0aW9uO1xuICAgICAgICBleGFjdG5lc1RocmVzaG9sZD1ldi5kYXRhLmFjY3VyYWN5O1xuICAgIH1cbn0iLCJpbXBvcnQge1BlcnNvbn0gZnJvbSBcIi4vUGVyc29uXCI7XG5cbi8qKlxuICogQGNsYXNzXG4gKiBAcHJvcGVydHkge251bWJlcj99IGludGVuc2l0eSAtIFByb2JhYmlsaXR5IG9mIGluZmVjdGluZyB0aGUgb3RoZXIgb25lXG4gKiBAcHJvcGVydHkge0RhdGU/fSBkYXRlXG4gKi9cbmNsYXNzIENvbnRhY3RPcHRpb25ze1xuICAgIGludGVuc2l0eTpudW1iZXI9MC41O1xuICAgIGRhdGU6RGF0ZT1uZXcgRGF0ZSgpO1xufVxuXG4vKipcbiAqIEBjbGFzc1xuICogQGV4dGVuZHMge0NvbnRhY3RPcHRpb25zfVxuICovXG5leHBvcnQgY2xhc3MgQ29udGFjdCBleHRlbmRzIENvbnRhY3RPcHRpb25ze1xuICAgIGE6IFBlcnNvbjtcbiAgICBiOiBQZXJzb247XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtQZXJzb259IGEgXG4gICAgICogQHBhcmFtIHtQZXJzb259IGIgXG4gICAgICogQHBhcmFtIHtDb250YWN0T3B0aW9uc30gb3B0aW9ucyBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhOiBQZXJzb24sYjogUGVyc29uLG9wdGlvbnM6IENvbnRhY3RPcHRpb25zKXtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5hPWE7XG4gICAgICAgIHRoaXMuYj1iO1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMsb3B0aW9ucyk7XG4gICAgfVxuICAgIHByb2Nlc3MoKXtcbiAgICAgICAgXG4gICAgfVxufSIsImltcG9ydCB7IGFsZ29yaXRobWljQ29uc3RhbnRzIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbi8qKlxuICogQHR5cGVkZWYgeyhkYXRlOkRhdGUpPT57Y29udGFjdERlbnNpdHk6bnVtYmVyLGNvbnRhY3RJbnRlbnNpdHk6bnVtYmVyfX0gdW50cmFja2VkQWN0aXZpdHlcbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIFVudHJhY2tlZENvbnRhY3Qge1xuICAgIC8qKi1kYXRlIGF0IHdoaWNoIHRoZSBjb250YWN0IHRha2VzIHBsYWNlICovXG4gICAgZGF0ZTogRGF0ZTtcbiAgICAvKipwZXJzb24gaGF2aW5nIGFuIHVudHJhY2tlZCBjb250YWN0ICovXG4gICAgcGVyc29uOiBQZXJzb247XG4gICAgLyoqcHJvYmFiaWxpdHkgb2YgdHJhbnNtaXNzaW9uIGlmIG9uZSBvZiB0aGUgcGVyc29ucyBpcyBpbmZlY3RlZCBhbmQgdGhlIG90aGVyIG9uZSBub3QgKi9cbiAgICBpbnRlbnNpdHk6IG51bWJlcjtcbiAgICAvKip3aGV0aGVyIG90aGVyIHBlcnNvbiBpcyBpbmZlY3RlZCBhY3V0ZWx5ICovXG4gICAgYWN1dGVJbmZlY3RlZDogYm9vbGVhbjtcbiAgICAvKip3aGV0aGVyIHRoZSBvdGhlciBwZXJzb24gd2FzIGluZmVjdGVkIGF0IGFueSBwb2ludCBpbiB0aW1lICovXG4gICAgZXZlckluZmVjdGVkOiBib29sZWFuO1xufVxuLyoqIGdlbmVyYXRlcyBuZXh0IHVudHJhY2tlZCBjb250YWN0IHN0YXJ0aW5nIGF0IGEgZ2l2ZW4gZGF0ZSAqL1xuZXhwb3J0IHR5cGUgdW50cmFja2VkQ29udGFjdEdlbmVyYXRvciA9IChkYXRlOiBEYXRlLCBwZXJzb246IFBlcnNvbikgPT4gVW50cmFja2VkQ29udGFjdDtcblxuY29uc3QgZGVmYXVsdENvbnRhY3RHZW5lcmF0b3I6IHVudHJhY2tlZENvbnRhY3RHZW5lcmF0b3IgPSAoZGF0ZTogRGF0ZSwgcGVyc29uOiBQZXJzb24pID0+ICh7XG4gICAgZGF0ZTogbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkgKyAyICogTWF0aC5yYW5kb20oKSAqIDEwMDAgKiA2MCAqIDYwICogMjQgLyBwZXJzb24udW50cmFja2VkRnJlcXVlbmN5KSxcbiAgICBhY3V0ZUluZmVjdGVkOiAwLjAwMSA+IE1hdGgucmFuZG9tKCksXG4gICAgZXZlckluZmVjdGVkOiAwLjAxID4gTWF0aC5yYW5kb20oKSxcbiAgICBpbnRlbnNpdHk6IDIgKiBNYXRoLnJhbmRvbSgpICogcGVyc29uLnVudHJhY2tlZEludGVuc2l0eSxcbiAgICBwZXJzb246IHBlcnNvblxufSk7XG4vKipcbiAqIENsYXNzIHJlcHJlc2VudGluZyBwZXJzb25zIGluIHRoZSByZWFsIHdvcmxkLlxuICovXG5leHBvcnQgY2xhc3MgUGVyc29uIHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgdW50cmFja2VkRnJlcXVlbmN5OiBudW1iZXI7XG4gICAgdW50cmFja2VkSW50ZW5zaXR5OiBudW1iZXI7XG4gICAgZXh0ZXJuYWxBY3Rpdml0eTogdW50cmFja2VkQ29udGFjdEdlbmVyYXRvcjtcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgICAqIEBwYXJhbSB7dW50cmFja2VkQ29udGFjdEdlbmVyYXRvcn0gZXh0ZXJuYWxBY3Rpdml0eSAtIGdlbmVyYXRlcyBuZXh0IGNvbnRhY3Qgb2YgcGVyc29uIHN0YXJ0aW5nIGF0IGdpdmVuIGRhdGVcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIHVudHJhY2tlZEZyZXF1ZW5jeSA9IDEsIHVudHJhY2tlZEludGVuc2l0eSA9IDAuMSwgZXh0ZXJuYWxBY3Rpdml0eTogdW50cmFja2VkQ29udGFjdEdlbmVyYXRvciA9IGRlZmF1bHRDb250YWN0R2VuZXJhdG9yKSB7XG4gICAgICAgIHRoaXMuZXh0ZXJuYWxBY3Rpdml0eSA9IGV4dGVybmFsQWN0aXZpdHk7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMudW50cmFja2VkRnJlcXVlbmN5ID0gdW50cmFja2VkRnJlcXVlbmN5O1xuICAgICAgICB0aGlzLnVudHJhY2tlZEludGVuc2l0eSA9IHVudHJhY2tlZEludGVuc2l0eTtcbiAgICB9XG59IiwiaW1wb3J0IHsgUGVyc29uLCBVbnRyYWNrZWRDb250YWN0IH0gZnJvbSBcIi4vUGVyc29uXCI7XG5pbXBvcnQgeyBDb250YWN0IH0gZnJvbSBcIi4vQ29udGFjdFwiO1xuaW1wb3J0IHsgVmlydXMgfSBmcm9tIFwiLi9WaXJ1c1wiO1xuaW1wb3J0IHsgT2JzZXJ2YXRpb24sIFRlc3QgfSBmcm9tIFwiLi9UZXN0XCI7XG5pbXBvcnQgeyBhbGdvcml0aG1pY0NvbnN0YW50cyB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNVbnRyYWNrZWQoY29udGFjdDogVW50cmFja2VkQ29udGFjdCB8IENvbnRhY3QpOiBjb250YWN0IGlzIFVudHJhY2tlZENvbnRhY3Qge1xuICAgIHJldHVybiAoY29udGFjdCBhcyBVbnRyYWNrZWRDb250YWN0KS5wZXJzb24gIT0gbnVsbDtcbn1cbi8qKlxuICogU2ltdWxhdGlvbiBvZiBhbiBpbmZlY3Rpb24uIFByb3ZpZGVzIHRoZSBmdW5jdGlvbmFsaXR5IHRvIHNpbXVsYXRlIHRoZSBwbG90IG1hbnkgdGltZXMgdG8gYXBwcm94aW1hdGUgcHJvYmFiaWxpdGllcyBhdCBnaXZlbiB0ZXN0IHJlc3VsdHNcbiAqL1xuZXhwb3J0IGNsYXNzIFNpbXVsYXRpb24ge1xuICAgIG9ic2VydmF0aW9uczogT2JzZXJ2YXRpb25bXTtcbiAgICBpbml0aWFsRGF0ZTogRGF0ZTtcbiAgICBsYXN0RGF0ZTogRGF0ZTtcbiAgICBwZXJzb25zOiBTZXQ8UGVyc29uPjtcbiAgICBjb250YWN0czogQ29udGFjdFtdO1xuICAgIHBlcnNvblRvSW5pdGlhbEluZmVjdGlvbkRhdGU6IE1hcDxQZXJzb24sICgpID0+IERhdGU+O1xuICAgIGNvbnN0cnVjdG9yKGluaXRpYWxEYXRlOiBEYXRlID0gbmV3IERhdGUoKSwgb2JzZXJ2YXRpb25zOiBPYnNlcnZhdGlvbltdID0gW10pIHtcbiAgICAgICAgdGhpcy5vYnNlcnZhdGlvbnMgPSBvYnNlcnZhdGlvbnM7XG4gICAgICAgIHRoaXMuaW5pdGlhbERhdGUgPSBpbml0aWFsRGF0ZTtcbiAgICAgICAgdGhpcy5sYXN0RGF0ZSA9IGluaXRpYWxEYXRlO1xuICAgICAgICAvKipAdHlwZSB7U2V0PFBlcnNvbj59Ki9cbiAgICAgICAgdGhpcy5wZXJzb25zID0gbmV3IFNldCgpO1xuICAgICAgICAvKiogQHR5cGUge0NvbnRhY3RbXX0gKi9cbiAgICAgICAgdGhpcy5jb250YWN0cyA9IFtdO1xuICAgICAgICAvKipcbiAgICAgICAgICogQXNzaWducyBhIGZ1bmN0aW9uIHRvIGVhY2ggcGVyc29uIHdoaWNoIGdlbmVyYXRlcyBhbiBpbml0aWFsIGluZmVjdGlvbiBkYXRlIChvciBudWxsIGlmIG5vIGluZmVjdGlvbiBoYXBwZW5lZClcbiAgICAgICAgICogQHR5cGUge01hcDxQZXJzb24sKCk9PkRhdGU/fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5wZXJzb25Ub0luaXRpYWxJbmZlY3Rpb25EYXRlID0gbmV3IE1hcCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge1BlcnNvbn0gcGVyc29uIFxuICAgICAqIEBwYXJhbSB7KCk9PkRhdGU/fSBkYXRlR2VuZXJhdG9yIC1mdW5jdGlvbiB3aGljaCBnZW5lcmF0ZXMgYW4gaW5pdGlhbCBpbmZlY3Rpb24gZGF0ZSAob3IgbnVsbCBpZiBubyBpbmZlY3Rpb24gaGFwcGVuZWQpXG4gICAgICovXG4gICAgc2V0SW5mZWN0aW9uRGF0ZUZ1bmN0aW9uKHBlcnNvbjogUGVyc29uLCBkYXRlR2VuZXJhdG9yOiAoKSA9PiBEYXRlIHwgbnVsbCkge1xuICAgICAgICB0aGlzLnBlcnNvblRvSW5pdGlhbEluZmVjdGlvbkRhdGUuc2V0KHBlcnNvbiwgZGF0ZUdlbmVyYXRvcik7XG4gICAgfVxuICAgIC8qKkBwYXJhbSB7UGVyc29ufSB0b0FkZCAqL1xuICAgIGFkZFBlcnNvbih0b0FkZDogUGVyc29uKSB7XG4gICAgICAgIHRoaXMucGVyc29ucy5hZGQodG9BZGQpO1xuXG4gICAgICAgIHRoaXMucGVyc29uVG9Jbml0aWFsSW5mZWN0aW9uRGF0ZS5zZXQodG9BZGQsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC4wMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZSh0aGlzLmluaXRpYWxEYXRlLmdldFRpbWUoKSAtIE1hdGgucmFuZG9tKCkgKiAxMDAgKiBhbGdvcml0aG1pY0NvbnN0YW50cy5kYXlUb01TKTsvL3JhbmRvbSBkYXkgaW4gdGhlIGxhc3QgMTAwIGRheXNcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqIEBwYXJhbSB7Q29udGFjdH0gdG9BZGQgLSBjb250YWN0IHRvIGJlIGFkZGVkIHRvIHRoZSBwcm9jZXNzaW9uIGxpc3QgKi9cbiAgICBhZGRDb250YWN0KHRvQWRkOiBDb250YWN0KSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jb250YWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRvQWRkLmRhdGUuZ2V0VGltZSgpIDwgdGhpcy5jb250YWN0c1tpXS5kYXRlLmdldFRpbWUoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGFjdHMuc3BsaWNlKGksIDAsIHRvQWRkKTtcbiAgICAgICAgICAgICAgICB0aGlzLnBlcnNvbnMuYWRkKHRvQWRkLmEpO1xuICAgICAgICAgICAgICAgIHRoaXMucGVyc29ucy5hZGQodG9BZGQuYik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29udGFjdHMucHVzaCh0b0FkZCk7XG4gICAgICAgIHRoaXMuYWRkUGVyc29uKHRvQWRkLmEpO1xuICAgICAgICB0aGlzLmFkZFBlcnNvbih0b0FkZC5iKTtcbiAgICAgICAgaWYgKHRoaXMubGFzdERhdGUgPCB0b0FkZC5kYXRlKVxuICAgICAgICAgICAgdGhpcy5sYXN0RGF0ZSA9IHRvQWRkLmRhdGU7XG4gICAgfVxuICAgIC8qKm9yZGVyIGNvbnRhY3RzIHRvIGF2b2lkIGFueSBlcnJvcnMgKi9cbiAgICByZWZyZXNoQ29udGFjdHMoKSB7XG4gICAgICAgIHRoaXMuY29udGFjdHMuc29ydCgoYSwgYikgPT4gYS5kYXRlLmdldFRpbWUoKSAtIGIuZGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICBpZiAodGhpcy5jb250YWN0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBuZXdMYXN0RGF0ZSA9IHRoaXMuY29udGFjdHNbdGhpcy5jb250YWN0cy5sZW5ndGggLSAxXS5kYXRlO1xuICAgICAgICAgICAgaWYobmV3TGFzdERhdGU+dGhpcy5sYXN0RGF0ZSlcbiAgICAgICAgICAgICAgICB0aGlzLmxhc3REYXRlPW5ld0xhc3REYXRlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IG8gb2YgdGhpcy5vYnNlcnZhdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChvIGluc3RhbmNlb2YgVGVzdCAmJiBvLmRhdGUgJiYgby5kYXRlID4gdGhpcy5sYXN0RGF0ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMubGFzdERhdGUgPSBvLmRhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY29udGFjdHMubGVuZ3RoID4gMCAmJiB0aGlzLmluaXRpYWxEYXRlID4gdGhpcy5jb250YWN0c1swXS5kYXRlKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxEYXRlID0gdGhpcy5jb250YWN0c1swXS5kYXRlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNpbXVsYXRlT25jZSgpIHtcbiAgICAgICAgY29uc3QgbGFzdERhdGVUb1NpbXVsYXRlID0gdGhpcy5sYXN0RGF0ZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEB0eXBlIHtNYXA8UGVyc29uLERhdGU+fVxuICAgICAgICAgKi9cbiAgICAgICAgY29uc3QgcmVzdWx0OiBNYXA8UGVyc29uLCBEYXRlPiA9IG5ldyBNYXAoKTtcbiAgICAgICAgLyoqQHR5cGUge1VudHJhY2tlZENvbnRhY3R8Q29udGFjdClbXX0gKi9cbiAgICAgICAgY29uc3QgZXZlbnRzOiAoVW50cmFja2VkQ29udGFjdCB8IENvbnRhY3QpW10gPSBuZXcgQXJyYXkoLi4udGhpcy5jb250YWN0cyk7XG4gICAgICAgIC8qKkB0eXBlIHsoY29udGFjdDppbXBvcnQoXCIuL1BlcnNvbi5qc1wiKS5VbnRyYWNrZWRDb250YWN0KT0+dm9pZH0gKi9cbiAgICAgICAgY29uc3QgYWRkVW50cmFja2VkQ29udGFjdDogKGNvbnRhY3Q6IFVudHJhY2tlZENvbnRhY3QpID0+IHZvaWQgPSAoY29uc3RhY3QpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBjb25zdGFjdC5kYXRlO1xuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBldmVudHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnRzW2ldLmRhdGUgPiBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50cy5zcGxpY2UoTnVtYmVyLnBhcnNlSW50KGkpLCAwLCBjb25zdGFjdCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBldmVudHMucHVzaChjb25zdGFjdCk7XG4gICAgICAgIH07XG4gICAgICAgIGZvciAobGV0IHBlcnNvbiBvZiB0aGlzLnBlcnNvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGluaXRpYWxEYXRlID0gdGhpcy5wZXJzb25Ub0luaXRpYWxJbmZlY3Rpb25EYXRlLmdldChwZXJzb24pKCk7XG4gICAgICAgICAgICByZXN1bHQuc2V0KHBlcnNvbiwgaW5pdGlhbERhdGUpO1xuICAgICAgICAgICAgZm9yIChsZXQgY29udGFjdCA9IHBlcnNvbi5leHRlcm5hbEFjdGl2aXR5KHRoaXMuaW5pdGlhbERhdGUsIHBlcnNvbik7IGNvbnRhY3QuZGF0ZSA8IGxhc3REYXRlVG9TaW11bGF0ZTsgY29udGFjdCA9IHBlcnNvbi5leHRlcm5hbEFjdGl2aXR5KGNvbnRhY3QuZGF0ZSwgcGVyc29uKSkge1xuICAgICAgICAgICAgICAgIGlmIChjb250YWN0LmFjdXRlSW5mZWN0ZWQpXG4gICAgICAgICAgICAgICAgICAgIGFkZFVudHJhY2tlZENvbnRhY3QoY29udGFjdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgY29udGFjdCBvZiBldmVudHMpIHtcbiAgICAgICAgICAgIGlmIChpc1VudHJhY2tlZChjb250YWN0KSkge1xuICAgICAgICAgICAgICAgIC8vY29udGFjdCBpcyB1bnRyYWNrZWQuIFRoaXMgaXMgb25seSB0cmlnZ2VyZWQgaWYgdGhlIG90aGVyIHBlcnNvbiBpcyBpbmZlY3RlZFxuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0LmdldChjb250YWN0LnBlcnNvbikgJiYgTWF0aC5yYW5kb20oKSA8IGNvbnRhY3QuaW50ZW5zaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXQoY29udGFjdC5wZXJzb24sIGNvbnRhY3QuZGF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9jb250YWN0IGlzIHRyYWNrZWRcbiAgICAgICAgICAgIGNvbnN0IGFEYXRlID0gcmVzdWx0LmdldChjb250YWN0LmEpO1xuICAgICAgICAgICAgY29uc3QgYkRhdGUgPSByZXN1bHQuZ2V0KGNvbnRhY3QuYik7XG4gICAgICAgICAgICAvLyBpZiBib3RoIG9yIG5vbmUgaXMgaW5mZWN0ZWQgbm90aGluZyBoYXBwZW5zXG4gICAgICAgICAgICBpZiAoYURhdGUgJiYgYkRhdGUgfHwgIWFEYXRlICYmICFiRGF0ZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGlmIChhRGF0ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2JhYmlsaXR5T2ZJbmZlY3Rpb24gPSBjb250YWN0LmludGVuc2l0eSAqIFZpcnVzLmdldFByb2JhYmlsaXR5T2ZJbmZlY3Rpb3VzbmVzcyhhRGF0ZSwgY29udGFjdC5kYXRlKTtcbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IHByb2JhYmlsaXR5T2ZJbmZlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldChjb250YWN0LmIsIGNvbnRhY3QuZGF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGJEYXRlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvYmFiaWxpdHlPZkluZmVjdGlvbiA9IGNvbnRhY3QuaW50ZW5zaXR5ICogVmlydXMuZ2V0UHJvYmFiaWxpdHlPZkluZmVjdGlvdXNuZXNzKGJEYXRlLCBjb250YWN0LmRhdGUpO1xuICAgICAgICAgICAgICAgIGlmIChwcm9iYWJpbGl0eU9mSW5mZWN0aW9uIDw9IDApXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgcHJvYmFiaWxpdHlPZkluZmVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0KGNvbnRhY3QuYSwgY29udGFjdC5kYXRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHByb2JhYmlsaXR5ID0gMTtcbiAgICAgICAgZm9yIChsZXQgb2JzZXJ2YXRpb24gb2YgdGhpcy5vYnNlcnZhdGlvbnMpIHtcbiAgICAgICAgICAgIHByb2JhYmlsaXR5ICo9IG9ic2VydmF0aW9uLmdldFByb2JhYmlsaXR5KHJlc3VsdC5nZXQob2JzZXJ2YXRpb24ucGVyc29uKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHByb2JhYmlsaXR5OiBwcm9iYWJpbGl0eSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVzdWx0XG4gICAgICAgIH07XG4gICAgfVxuICAgIHByb2Nlc3NTaW11bGF0aW9uUmVzdWx0cyhyZXN1bHRzOiB7IHJlc3VsdDogTWFwPFBlcnNvbiwgRGF0ZT47IHByb2JhYmlsaXR5OiBudW1iZXI7IH1bXSkge1xuXG4gICAgICAgIGxldCBwcm9iYWJpbGl0eVN1bSA9IDA7XG4gICAgICAgIGZvciAobGV0IHJlc3VsdCBvZiByZXN1bHRzKVxuICAgICAgICAgICAgcHJvYmFiaWxpdHlTdW0gKz0gcmVzdWx0LnByb2JhYmlsaXR5O1xuICAgICAgICAvKipAdHlwZSB7TWFwPFBlcnNvbixudW1iZXI+fSAqL1xuICAgICAgICBjb25zdCB0b3RhbEluZmVjdGlvblByb2JhYmlsaXR5OiBNYXA8UGVyc29uLCBudW1iZXI+ID0gbmV3IE1hcCgpO1xuICAgICAgICBmb3IgKGxldCBwZXJzb24gb2YgdGhpcy5wZXJzb25zKSB7XG4gICAgICAgICAgICB0b3RhbEluZmVjdGlvblByb2JhYmlsaXR5LnNldChwZXJzb24sIDApO1xuICAgICAgICB9XG4gICAgICAgIC8qKkB0eXBlIHtNYXA8UGVyc29uLHtkYXRlOkRhdGUscDpudW1iZXIsIHBBY2M6bnVtYmVyP31bXT59ICovXG4gICAgICAgIGNvbnN0IGluZmVjdGlvbkRhdGVzOiBNYXA8UGVyc29uLCB7IGRhdGU6IERhdGU7IHA6IG51bWJlcjsgcEFjYzogbnVtYmVyIHwgbnVsbDsgfVtdPiA9IG5ldyBNYXAoKTtcbiAgICAgICAgZm9yIChsZXQgcGVyc29uIG9mIHRoaXMucGVyc29ucylcbiAgICAgICAgICAgIGluZmVjdGlvbkRhdGVzLnNldChwZXJzb24sIFtdKTtcbiAgICAgICAgZm9yIChsZXQgcmVzdWx0IG9mIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIGNvbnN0IHJlYWxQcm9iID0gcmVzdWx0LnByb2JhYmlsaXR5IC8gcHJvYmFiaWxpdHlTdW07XG5cbiAgICAgICAgICAgIGZvciAobGV0IHBlcnNvbiBvZiB0aGlzLnBlcnNvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnJlc3VsdC5nZXQocGVyc29uKSlcbiAgICAgICAgICAgICAgICAgICAgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eS5zZXQocGVyc29uLCB0b3RhbEluZmVjdGlvblByb2JhYmlsaXR5LmdldChwZXJzb24pICsgcmVhbFByb2IpO1xuICAgICAgICAgICAgICAgIGluZmVjdGlvbkRhdGVzLmdldChwZXJzb24pLnB1c2goeyBkYXRlOiByZXN1bHQucmVzdWx0LmdldChwZXJzb24pLCBwOiByZWFsUHJvYiwgcEFjYzogbnVsbCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBwZXJzb24gb2YgdGhpcy5wZXJzb25zKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZlY3Rpb25EYXRlc1BlcnNvbiA9IGluZmVjdGlvbkRhdGVzLmdldChwZXJzb24pO1xuICAgICAgICAgICAgaW5mZWN0aW9uRGF0ZXNQZXJzb24uc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghYS5kYXRlICYmICFiLmRhdGUpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgIGlmICghYS5kYXRlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICBpZiAoIWIuZGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgICAgIHJldHVybiBhLmRhdGUuZ2V0VGltZSgpIC0gYi5kYXRlLmdldFRpbWUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbGV0IGFjY3VtdWxhdGVkUHJvYiA9IDA7XG4gICAgICAgICAgICBmb3IgKGxldCBkYXRlIG9mIGluZmVjdGlvbkRhdGVzUGVyc29uKSB7XG4gICAgICAgICAgICAgICAgYWNjdW11bGF0ZWRQcm9iICs9IGRhdGUucDtcbiAgICAgICAgICAgICAgICBkYXRlLnBBY2MgPSBhY2N1bXVsYXRlZFByb2I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaW5pdGlhbERhdGU6IHRoaXMuaW5pdGlhbERhdGUsXG4gICAgICAgICAgICB0b3RhbEluZmVjdGlvblByb2JhYmlsaXR5OiB0b3RhbEluZmVjdGlvblByb2JhYmlsaXR5LFxuICAgICAgICAgICAgaW5mZWN0aW9uVGltZWxpbmU6IGluZmVjdGlvbkRhdGVzXG4gICAgICAgIH07XG4gICAgfVxuICAgIHNpbXVsYXRlKHJ1bnM6IG51bWJlcikge1xuICAgICAgICBjb25zdCByZXN1bHRzOiB7IHJlc3VsdDogTWFwPFBlcnNvbiwgRGF0ZT47IHByb2JhYmlsaXR5OiBudW1iZXI7IH1bXSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJ1bnM7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5zaW11bGF0ZU9uY2UoKTtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaChyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NTaW11bGF0aW9uUmVzdWx0cyhyZXN1bHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjb21wdXRlcyBhbiBhcnJheSByZXByZXNlbnRhdGlvbiBvZiB0aGUgc2ltdWxhdGlvbiByZXN1bHRzXG4gICAgICogQHBhcmFtIHJlc3VsdCAtc2ltdWxhdGlvbiByZXN1bHQgb2JqZWN0XG4gICAgICogQHBhcmFtIHJlc29sdXRpb24gLSBudW1iZXIgb2YgZGF0YXBvaW50cyB0byBzaG93IHBlciBkYXlcbiAgICAgKiBAcGFyYW0gbGFzdERhdGUgLSBsYXN0IGRhdGUgdG8gc2ltdWxhdGUgaW4gbXMgZnJvbSAxOTcwXG4gICAgICovXG4gICAgc3RhdGljIHRvQXJyYXkocmVzdWx0OiB7XG4gICAgICAgIGluaXRpYWxEYXRlOiBEYXRlO1xuICAgICAgICB0b3RhbEluZmVjdGlvblByb2JhYmlsaXR5OiBNYXA8UGVyc29uLCBudW1iZXI+O1xuICAgICAgICBpbmZlY3Rpb25UaW1lbGluZTogTWFwPFBlcnNvbiwge1xuICAgICAgICAgICAgZGF0ZTogRGF0ZTtcbiAgICAgICAgICAgIHA6IG51bWJlcjtcbiAgICAgICAgICAgIHBBY2M6IG51bWJlcjtcbiAgICAgICAgfVtdPjtcbiAgICB9LCByZXNvbHV0aW9uOiBudW1iZXIsIGxhc3REYXRlOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgcGVyc29uQXJyYXkgPSBuZXcgQXJyYXkoLi4ucmVzdWx0LmluZmVjdGlvblRpbWVsaW5lLmtleXMoKSk7XG4gICAgICAgIGNvbnN0IGxpc3Q6IHsgZGF0ZTogRGF0ZSwgdmFsdWVzOiBudW1iZXJbXSB9W10gPSBbXVxuICAgICAgICBjb25zdCBpbmRpY2VzID0gcGVyc29uQXJyYXkubWFwKChwZXJzb24pID0+IDApO1xuICAgICAgICBmb3IgKGxldCBkYXRlID0gcmVzdWx0LmluaXRpYWxEYXRlOyBkYXRlLmdldFRpbWUoKSA8IGxhc3REYXRlOyBkYXRlID0gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkgKyByZXNvbHV0aW9uICogMTAwMCAqIDYwICogNjAgKiAyNCkpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlcyA9IG5ldyBBcnJheShwZXJzb25BcnJheS5sZW5ndGgpO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwZXJzb25BcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBlcnNvbiA9IHBlcnNvbkFycmF5W2ldO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBlcnNvblZhbHVlcyA9IHJlc3VsdC5pbmZlY3Rpb25UaW1lbGluZS5nZXQocGVyc29uKTtcbiAgICAgICAgICAgICAgICBsZXQgaW5kZXggPSBpbmRpY2VzW2ldO1xuICAgICAgICAgICAgICAgIHdoaWxlIChpbmRleCArIDEgPCBwZXJzb25WYWx1ZXMubGVuZ3RoICYmIHBlcnNvblZhbHVlc1tpbmRleCArIDFdLmRhdGUgJiYgcGVyc29uVmFsdWVzW2luZGV4ICsgMV0uZGF0ZSA8IGRhdGUpXG4gICAgICAgICAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICAgICAgaW5kaWNlc1tpXSA9IGluZGV4O1xuICAgICAgICAgICAgICAgIG5ld1ZhbHVlc1tpXSA9IHBlcnNvblZhbHVlc1tpbmRleF0ucEFjYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxpc3QucHVzaCh7IGRhdGU6IGRhdGUsIHZhbHVlczogbmV3VmFsdWVzIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cblxuXG5cbiAgICAvKipyZXR1cm5zIHRoZSBwZXJzb25zIGFzIGFycmF5IHRvIGJlIGFibGUgdG8gdXNlIEFycmF5Lm1hcCBldGMgKi9cbiAgICBnZXQgcGVyc29uQXJyYXkoKSB7XG4gICAgICAgIHJldHVybiBuZXcgQXJyYXkoLi4udGhpcy5wZXJzb25zKTtcbiAgICB9XG59IiwiaW1wb3J0IHsgVmlydXMgfSBmcm9tIFwiLi9WaXJ1c1wiO1xuaW1wb3J0IHsgUGVyc29uIH0gZnJvbSBcIi4vUGVyc29uXCI7XG5pbXBvcnQgeyBhbGdvcml0aG1pY0NvbnN0YW50cyB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xuXG5leHBvcnQgY2xhc3MgT2JzZXJ2YXRpb24ge1xuICAgIHBlcnNvbjogUGVyc29uO1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7UGVyc29ufSBwZXJzb24gXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocGVyc29uOiBQZXJzb24pIHtcbiAgICAgICAgdGhpcy5wZXJzb24gPSBwZXJzb247XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RGF0ZT99IGRhdGVPZkluZmVjdGlvbiAtIGRhdGUgYXQgd2hpY2ggYW4gaW5mZWN0aW9uIG9jY3VycyBvciBudWxsIHdoZW4gaXQgZG9lcyBub3Qgb2NjdXJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBwcm9iYWJpbGl0eSB0aGF0IHRoaXMgb2JzZXJ2YXRpb24gb2NjdXJzIGdpdmVuIGFuIGludmVjdGlvblxuICAgICAqL1xuICAgIGdldFByb2JhYmlsaXR5KGRhdGVPZkluZmVjdGlvbjogRGF0ZSB8IG51bGwpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxufVxuLyoqXG4gKiBAdHlwZWRlZiB7T2JqZWN0fSBUZXN0T3B0aW9uc1xuICogQHByb3BlcnR5IHtudW1iZXJ9IHNlbnNpdGl2aXR5XG4gKiBAcHJvcGVydHkge251bWJlcn0gc3BlY2lmaWNpdHlcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSB0aW1lVFxuICovXG5cbi8qKlxuICogQGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBUZXN0IGV4dGVuZHMgT2JzZXJ2YXRpb24ge1xuICAgIHN0YXJ0T2JzZXJ2YWJpbGl0eTogbnVtYmVyO1xuICAgIGVuZE9ic2VydmFiaWxpdHk6IG51bWJlcjtcbiAgICBwb3NpdGl2ZTogYm9vbGVhbjtcbiAgICBzZW5zaXRpdml0eTogbnVtYmVyO1xuICAgIHNwZWNpZmljaXR5OiBudW1iZXI7XG4gICAgZGF0ZTogRGF0ZTtcbiAgICByZWxldmFudFRpbWVTdGFydDogRGF0ZTtcbiAgICByZWxldmFudFRpbWVFbmQ6IERhdGU7XG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtQZXJzb259IHBlcnNvblxuICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSAtIGRhdGUgb2YgdGhlIHRlc3RcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHBvc2l0aXZlIC0gdHJ1ZSBpZiB0aGUgcmVzdWx0IGlzIHBvc2l0aXZlXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocGVyc29uOiBQZXJzb24sIGRhdGU6IERhdGUsIHBvc2l0aXZlOiBib29sZWFuLCBzZW5zaXRpdml0eSA9IDAuOTUsIHNwZWNpZmljaXR5ID0gMC45LCBzdGFydE9ic2VydmFiaWxpdHkgPSAyLCBlbmRPYnNlcnZhYmlsaXR5ID0gMTQpIHtcbiAgICAgICAgc3VwZXIocGVyc29uKTtcbiAgICAgICAgdGhpcy5zZXREYXRlKGRhdGUpO1xuICAgICAgICB0aGlzLnN0YXJ0T2JzZXJ2YWJpbGl0eSA9IHN0YXJ0T2JzZXJ2YWJpbGl0eTtcbiAgICAgICAgdGhpcy5lbmRPYnNlcnZhYmlsaXR5ID0gZW5kT2JzZXJ2YWJpbGl0eTtcbiAgICAgICAgdGhpcy5wb3NpdGl2ZSA9IHBvc2l0aXZlO1xuICAgICAgICB0aGlzLnNlbnNpdGl2aXR5ID0gc2Vuc2l0aXZpdHk7XG4gICAgICAgIHRoaXMuc3BlY2lmaWNpdHkgPSBzcGVjaWZpY2l0eTtcbiAgICB9XG4gICAgc2V0RGF0ZShkYXRlID0gdGhpcy5kYXRlKSB7XG4gICAgICAgIHRoaXMuZGF0ZSA9IGRhdGU7XG4gICAgICAgIHRoaXMucmVsZXZhbnRUaW1lU3RhcnQgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgdGhpcy5yZWxldmFudFRpbWVTdGFydC5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gdGhpcy5lbmRPYnNlcnZhYmlsaXR5KTtcbiAgICAgICAgdGhpcy5yZWxldmFudFRpbWVFbmQgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgdGhpcy5yZWxldmFudFRpbWVFbmQuc2V0RGF0ZShkYXRlLmdldERhdGUoKSAtIHRoaXMuc3RhcnRPYnNlcnZhYmlsaXR5KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtEYXRlP30gZGF0ZU9mSW5mZWN0aW9uIC0gZGF0ZSBhdCB3aGljaCBhbiBpbmZlY3Rpb24gb2NjdXJzIG9yIG51bGwgd2hlbiBpdCBkb2VzIG5vdCBvY2N1clxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IHByb2JhYmlsaXR5IHRoYXQgdGhpcyBvYnNlcnZhdGlvbiBvY2N1cnMgZ2l2ZW4gYW4gaW52ZWN0aW9uXG4gICAgICovXG4gICAgZ2V0UHJvYmFiaWxpdHkoZGF0ZU9mSW5mZWN0aW9uOiBEYXRlIHwgbnVsbCk6IG51bWJlciB7XG4gICAgICAgIGlmIChkYXRlT2ZJbmZlY3Rpb24gJiYgZGF0ZU9mSW5mZWN0aW9uID4gdGhpcy5yZWxldmFudFRpbWVTdGFydCAmJiBkYXRlT2ZJbmZlY3Rpb24gPCB0aGlzLnJlbGV2YW50VGltZUVuZCkge1xuICAgICAgICAgICAgLy9pbmZlY3RlZFxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucG9zaXRpdmUgPyB0aGlzLnNlbnNpdGl2aXR5IDogMSAtIHRoaXMuc3BlY2lmaWNpdHk7XG4gICAgICAgIH1cbiAgICAgICAgLy9ub3QgaW5mZWN0ZWRcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zaXRpdmUgPyAoMSAtIHRoaXMuc3BlY2lmaWNpdHkpIDogdGhpcy5zZW5zaXRpdml0eTtcbiAgICB9XG59XG4vKipcbiAqIEEgbG9nIG9mIHRoZSBzeW1wdG9tcyBhIHBlcnNvbiBoYXMuIE5vdGUgdGhhdCBhIGxvZyBNVVNUIGNvbnRhaW4gQUxMIGxvZ3MgYWJvdXQgb25lIHBlcnNvbiFcbiAqL1xuZXhwb3J0IGNsYXNzIFN5bXB0b21Mb2cgZXh0ZW5kcyBPYnNlcnZhdGlvbiB7XG4gICAgbG9nOiBNYXA8RGF0ZSwgbnVtYmVyPjtcbiAgICBkYXRlczogRGF0ZVtdO1xuICAgIG1pbkRhdGU6IERhdGU7XG4gICAgbWF4RGF0ZTogRGF0ZTtcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge1BlcnNvbn0gcGVyc29uXG4gICAgICogQHBhcmFtIHtNYXA8RGF0ZSxudW1iZXI+fSBsb2cgLSBtYXBzIGRhdGVzIHN0cmVuZ3RoIG9mIGNvdmlkLXNwZWNpZmljIHN5bXB0b21zIG9mIHRoZSBwZXJzb24gYXQgdGhhdCBkYXRlLiBPTkxZIE9ORSBSRVBPUlQgUEVSIERBWSBBTExPV0VEISEhXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocGVyc29uOiBQZXJzb24sIGxvZzogTWFwPERhdGUsIG51bWJlcj4pIHtcbiAgICAgICAgc3VwZXIocGVyc29uKTtcbiAgICAgICAgdGhpcy5sb2cgPSBsb2c7XG4gICAgICAgIC8qKkB0eXBlIHtEYXRlW119ICovXG4gICAgICAgIHRoaXMuZGF0ZXMgPSBuZXcgQXJyYXkoLi4udGhpcy5sb2cua2V5cygpKTtcbiAgICAgICAgdGhpcy5kYXRlcy5zb3J0KCk7XG4gICAgICAgIHRoaXMubWluRGF0ZSA9IHRoaXMuZGF0ZXNbMF07XG4gICAgICAgIHRoaXMubWF4RGF0ZSA9IHRoaXMuZGF0ZXNbdGhpcy5kYXRlcy5sZW5ndGggLSAxXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtEYXRlP30gZGF0ZU9mSW5mZWN0aW9uIC0gZGF0ZSBhdCB3aGljaCBhbiBpbmZlY3Rpb24gb2NjdXJzIG9yIG51bGwgd2hlbiBpdCBkb2VzIG5vdCBvY2N1clxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IHByb2JhYmlsaXR5IHRoYXQgdGhpcyBvYnNlcnZhdGlvbiBvY2N1cnMgZ2l2ZW4gYW4gaW52ZWN0aW9uXG4gICAgICovXG4gICAgZ2V0UHJvYmFiaWxpdHkoZGF0ZU9mSW5mZWN0aW9uOiBEYXRlIHwgbnVsbCk6IG51bWJlciB7XG4gICAgICAgIGxldCB2aXJ1c1JlcG9ydFJhdGUgPSAwO1xuICAgICAgICBsZXQgaW5mZWN0aW9uTWF0Y2hpbmcgPSBWaXJ1cy5ub1N5bXB0b21Qcm9iYWJpbGl0eTsgLy9ob3cgbXVjaCB0aGUgaW5mZWN0aW9uIG1hdGNoZXMgd2l0aCB0aGUgcmVwb3J0IGRheXNcbiAgICAgICAgaWYgKGRhdGVPZkluZmVjdGlvbikge1xuICAgICAgICAgICAgLy9pbmZlY3RlZFxuICAgICAgICAgICAgY29uc3QgZmlyc3RSZWxldmFudERheSA9IG5ldyBEYXRlKGRhdGVPZkluZmVjdGlvbi5nZXRUaW1lKCkgKyBWaXJ1cy5pbmN1YmF0aW9uVGltZSAqIGFsZ29yaXRobWljQ29uc3RhbnRzLmRheVRvTVMpO1xuICAgICAgICAgICAgY29uc3QgbGFzdFJlbGV2YW50RGF5ID0gbmV3IERhdGUoZGF0ZU9mSW5mZWN0aW9uLmdldFRpbWUoKSArIFZpcnVzLmVuZE9mSW5mZWN0aW9zbmVzcyAqIGFsZ29yaXRobWljQ29uc3RhbnRzLmRheVRvTVMpO1xuICAgICAgICAgICAgY29uc3QgcmVsZXZhbnRSZXBvcnREYXlzID0gdGhpcy5kYXRlcy5maWx0ZXIoKGRhdGUpID0+IGZpcnN0UmVsZXZhbnREYXkgPD0gZGF0ZSAmJiBkYXRlIDw9IGxhc3RSZWxldmFudERheSk7Ly9yZXBvcnRzIGluIGluZmVjdGlvbiB0aW1lZnJhbWVcbiAgICAgICAgICAgIGZvciAobGV0IHJlbGV2YW50UmVwb3J0RGF5IG9mIHJlbGV2YW50UmVwb3J0RGF5cykge1xuICAgICAgICAgICAgICAgIGluZmVjdGlvbk1hdGNoaW5nID0gMSAtICgxIC0gaW5mZWN0aW9uTWF0Y2hpbmcpICogKDEgLSB0aGlzLmxvZy5nZXQocmVsZXZhbnRSZXBvcnREYXkpIC8gcmVsZXZhbnRSZXBvcnREYXlzLmxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbmZlY3Rpb25NYXRjaGluZyA9IHJlbGV2YW50UmVwb3J0RGF5cy5sZW5ndGggLyBWaXJ1cy5lbmRPZkluZmVjdGlvc25lc3M7XG4gICAgICAgIH1cbiAgICAgICAgLy9ub3QgaW5mZWN0ZWRcbiAgICAgICAgbGV0IGF2ZXJhZ2VJbGxuZXNzID0gMDtcbiAgICAgICAgZm9yIChsZXQgZGF5TG9nIG9mIHRoaXMubG9nKSB7XG4gICAgICAgICAgICBhdmVyYWdlSWxsbmVzcyArPSBkYXlMb2dbMV07XG4gICAgICAgIH1cbiAgICAgICAgYXZlcmFnZUlsbG5lc3MgLz0gdGhpcy5sb2cuc2l6ZTtcbiAgICAgICAgcmV0dXJuIHZpcnVzUmVwb3J0UmF0ZSAqIGluZmVjdGlvbk1hdGNoaW5nICsgKDEgLSB2aXJ1c1JlcG9ydFJhdGUpICogKDAuOSAtIDAuOCAqIGF2ZXJhZ2VJbGxuZXNzKTsgLy8wLjkgaWYgbm8gc3ltcHRvbXMsIDAuMSBpZiB0b3RhbCBzeW1wdG9tc1xuICAgIH1cbn0iLCJcblxuZXhwb3J0IGNsYXNzIFZpcnVzIHtcblxuXG4gICAgLyoqIGRheXMgYWZ0ZXIgaW5mZWN0aW9uIHdoZW4geW91IHN0YXJ0IGJlaW5nIGluZmVjdGlvdXMgKi9cbiAgICBzdGF0aWMgc3RhcnRPZkluZmVjdGlvc25lc3MgPSAyO1xuXG4gICAgLyoqIGRheXMgYWZ0ZXIgaW5mZWN0aW9uIHdoZW4geW91IHN0b3AgYmVpbmcgaW5mZWN0aW91cyAqL1xuICAgIHN0YXRpYyBlbmRPZkluZmVjdGlvc25lc3MgPSAxMDtcbiAgICAvKipkYXlzIGFmdGVyIGZpcnN0IHN5bXB0b21zIG9jY3VyICovXG4gICAgc3RhdGljIGluY3ViYXRpb25UaW1lID0gNS41O1xuICAgIC8qKnByb2JhYmlsaXR5IG9mIG5vdCBoYXZpbmcgYW55IHN5bXB0b21zIHdpdGggdGhlIHZpcnVzICovXG4gICAgc3RhdGljIG5vU3ltcHRvbVByb2JhYmlsaXR5ID0gMC41NTtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge1BlcnNvbkxvZ30gbG9nIFxuICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSAtIGRhdGUgdG8gZ2V0IHByb2JhYmlsaXR5IGZyb21cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSAtIHByb2JhYmlsaXR5IG9mIGJlaW5nIGluZmVjdGVkIGFuZCBhYmxlIHRvIHNwcmVhZCB0aGUgdmlydXMgYXQgdGhhdCBkYXRlXG4gICAgICovXG4gICAgc3RhdGljIGdldEFjdXRlSW5mZWN0aW9uUHJvYmFiaWxpdHkobG9nOiB7IGdldEluZmVjdGlvblByb2JhYmlsaXR5OiAoYXJnMDogRGF0ZSkgPT4gbnVtYmVyOyB9LCBkYXRlOiBEYXRlKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0SW5mZWN0aW9uUGVyaW9kID0gbmV3IERhdGUoZGF0ZSk7IHN0YXJ0SW5mZWN0aW9uUGVyaW9kLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgLSBWaXJ1cy5lbmRPZkluZmVjdGlvc25lc3MpO1xuICAgICAgICBjb25zdCBlbmRJbmZlY3Rpb25QZXJpb2QgPSBuZXcgRGF0ZShkYXRlKTsgZW5kSW5mZWN0aW9uUGVyaW9kLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgLSBWaXJ1cy5zdGFydE9mSW5mZWN0aW9zbmVzcyk7XG4gICAgICAgIHJldHVybiBsb2cuZ2V0SW5mZWN0aW9uUHJvYmFiaWxpdHkoZW5kSW5mZWN0aW9uUGVyaW9kKSAtIGxvZy5nZXRJbmZlY3Rpb25Qcm9iYWJpbGl0eShzdGFydEluZmVjdGlvblBlcmlvZCk7XG4gICAgfVxuICAgIHN0YXRpYyBnZXRQcm9iYWJpbGl0eU9mSW5mZWN0aW91c25lc3MoaW5mZWN0aW9uRGF0ZTogIERhdGUsIGN1cnJlbnREYXRlOiBEYXRlKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0SW5mZWN0aW9uUGVyaW9kID0gbmV3IERhdGUoaW5mZWN0aW9uRGF0ZSk7IHN0YXJ0SW5mZWN0aW9uUGVyaW9kLnNldERhdGUoaW5mZWN0aW9uRGF0ZS5nZXREYXRlKCkgKyBWaXJ1cy5zdGFydE9mSW5mZWN0aW9zbmVzcyk7XG4gICAgICAgIGNvbnN0IGVuZEluZmVjdGlvblBlcmlvZCA9IG5ldyBEYXRlKGluZmVjdGlvbkRhdGUpOyBlbmRJbmZlY3Rpb25QZXJpb2Quc2V0RGF0ZShpbmZlY3Rpb25EYXRlLmdldERhdGUoKSArIFZpcnVzLmVuZE9mSW5mZWN0aW9zbmVzcyk7XG4gICAgICAgIHJldHVybiAoc3RhcnRJbmZlY3Rpb25QZXJpb2QgPCBjdXJyZW50RGF0ZSAmJiBjdXJyZW50RGF0ZSA8IGVuZEluZmVjdGlvblBlcmlvZCkgPyAxIDogMDtcbiAgICB9XG59XG4iLCJleHBvcnQgY29uc3QgYWxnb3JpdGhtaWNDb25zdGFudHMgPSB7XG4gICAgZGVsdGFUOiAwLjEsXG4gICAgZGF5VG9NUzogMTAwMCAqIDYwICogNjAgKiAyNFxufTsiLCJpbXBvcnQgeyBDb250YWN0IH0gZnJvbSBcIi4vQ29udGFjdFwiO1xuaW1wb3J0IHsgUGVyc29uIH0gZnJvbSBcIi4vUGVyc29uXCI7XG5pbXBvcnQgeyBTaW11bGF0aW9uIH0gZnJvbSBcIi4vU2ltdWxhdGlvblwiO1xuaW1wb3J0IHsgT2JzZXJ2YXRpb24sIFRlc3QgfSBmcm9tIFwiLi9UZXN0XCI7XG5cbmludGVyZmFjZSBUZXN0U2VyaWFsaXphdGlvbiB7XG4gICAgdHlwZTogc3RyaW5nO1xuICAgIHBlcnNvbjogc3RyaW5nO1xuICAgIGRhdGU6IERhdGU7XG4gICAgcG9zaXRpdmU6IGJvb2xlYW47XG4gICAgc2Vuc2l0aXZpdHk6IG51bWJlcjtcbiAgICBzcGVjaWZpY2l0eTogbnVtYmVyO1xuICAgIHJlbGV2YW50VGltZVN0YXJ0OiBEYXRlO1xuICAgIHJlbGV2YW50VGltZUVuZDogRGF0ZTtcbn1cbmV4cG9ydCBjbGFzcyBTaW11bGF0aW9uU2VyaWFsaXphdGlvbiB7XG4gICAgcGVyc29uczoge1xuICAgICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICAgIHVudHJhY2tlZEZyZXF1ZW5jeTogbnVtYmVyO1xuICAgICAgICB1bnRyYWNrZWRJbnRlbnNpdHk6IG51bWJlcjtcbiAgICAgICAgYWN0aXZpdHlTdHJpbmc6IHN0cmluZztcbiAgICB9W107XG4gICAgY29udGFjdHM6IHtcbiAgICAgICAgYTogc3RyaW5nO1xuICAgICAgICBiOiBzdHJpbmc7XG4gICAgICAgIGRhdGU6IERhdGU7XG4gICAgICAgIGludGVuc2l0eTogbnVtYmVyO1xuICAgIH1bXTtcbiAgICB0ZXN0czogKFRlc3RTZXJpYWxpemF0aW9uIHwge1xuICAgICAgICB0eXBlOiBzdHJpbmdcbiAgICB9KVtdO1xuICAgIGluaXRpYWxEYXRlOiBEYXRlO1xuICAgIGxhc3REYXRlOiBEYXRlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUZXN0KG9ic2VydmF0aW9uOiBPYnNlcnZhdGlvbik6IG9ic2VydmF0aW9uIGlzIFRlc3Qge1xuICAgIHJldHVybiAob2JzZXJ2YXRpb24gYXMgVGVzdCkuZGF0ZSAhPT0gbnVsbDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBpc1NpbXVsYXRpb25TZXJpYWxpemF0aW9uKHNlcmlhbGl6YXRpb246IGFueSk6IHNlcmlhbGl6YXRpb24gaXMgU2ltdWxhdGlvblNlcmlhbGl6YXRpb24ge1xuICAgIGlmKCFzZXJpYWxpemF0aW9uLnBlcnNvbnMpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBwID0gKHNlcmlhbGl6YXRpb24gYXMgU2ltdWxhdGlvblNlcmlhbGl6YXRpb24pLnBlcnNvbnNbMF07XG4gICAgaWYgKHApIHtcbiAgICAgICAgaWYgKHAuYWN0aXZpdHlTdHJpbmcpXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZVNpbXVsYXRpb24oc2ltdWxhdGlvbjogU2ltdWxhdGlvbik6IFNpbXVsYXRpb25TZXJpYWxpemF0aW9uIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBwZXJzb25zOiBzaW11bGF0aW9uLnBlcnNvbkFycmF5Lm1hcCgocGVyc29uKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG5hbWU6IHBlcnNvbi5uYW1lLFxuICAgICAgICAgICAgICAgIHVudHJhY2tlZEZyZXF1ZW5jeTogcGVyc29uLnVudHJhY2tlZEZyZXF1ZW5jeSxcbiAgICAgICAgICAgICAgICB1bnRyYWNrZWRJbnRlbnNpdHk6IHBlcnNvbi51bnRyYWNrZWRJbnRlbnNpdHksXG4gICAgICAgICAgICAgICAgYWN0aXZpdHlTdHJpbmc6IHBlcnNvbi5leHRlcm5hbEFjdGl2aXR5LnRvU3RyaW5nKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIGNvbnRhY3RzOiBzaW11bGF0aW9uLmNvbnRhY3RzLm1hcChjb250YWN0ID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgYTogY29udGFjdC5hLm5hbWUsXG4gICAgICAgICAgICAgICAgYjogY29udGFjdC5iLm5hbWUsXG4gICAgICAgICAgICAgICAgZGF0ZTogY29udGFjdC5kYXRlLFxuICAgICAgICAgICAgICAgIGludGVuc2l0eTogY29udGFjdC5pbnRlbnNpdHksXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KSxcbiAgICAgICAgdGVzdHM6IHNpbXVsYXRpb24ub2JzZXJ2YXRpb25zLm1hcCgob2JzZXJ2YXRpb24pID0+IHtcbiAgICAgICAgICAgIGlmIChpc1Rlc3Qob2JzZXJ2YXRpb24pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJUZXN0XCIsXG4gICAgICAgICAgICAgICAgICAgIHBlcnNvbjogb2JzZXJ2YXRpb24ucGVyc29uLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IG9ic2VydmF0aW9uLmRhdGUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aXZlOiBvYnNlcnZhdGlvbi5wb3NpdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgc2Vuc2l0aXZpdHk6IG9ic2VydmF0aW9uLnNlbnNpdGl2aXR5LFxuICAgICAgICAgICAgICAgICAgICBzcGVjaWZpY2l0eTogb2JzZXJ2YXRpb24uc3BlY2lmaWNpdHksXG4gICAgICAgICAgICAgICAgICAgIHJlbGV2YW50VGltZVN0YXJ0OiBvYnNlcnZhdGlvbi5yZWxldmFudFRpbWVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgcmVsZXZhbnRUaW1lRW5kOiBvYnNlcnZhdGlvbi5yZWxldmFudFRpbWVFbmRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwidW5rbm93blwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICAgICAgaW5pdGlhbERhdGU6IHNpbXVsYXRpb24uaW5pdGlhbERhdGUsXG4gICAgICAgIGxhc3REYXRlOiBzaW11bGF0aW9uLmxhc3REYXRlXG4gICAgfVxufVxuZnVuY3Rpb24gaXNUZXN0U2VyaWFsaXphdGlvbih0ZXN0OiBUZXN0U2VyaWFsaXphdGlvbiB8IHsgdHlwZTogc3RyaW5nIH0pOiB0ZXN0IGlzIFRlc3RTZXJpYWxpemF0aW9uIHtcbiAgICByZXR1cm4gdGVzdC50eXBlID09IFwiVGVzdFwiO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHJldml2ZShzZXJpYWxpemF0aW9uOiBTaW11bGF0aW9uU2VyaWFsaXphdGlvbikge1xuICAgIGNvbnN0IHNpbSA9IG5ldyBTaW11bGF0aW9uKHNlcmlhbGl6YXRpb24uaW5pdGlhbERhdGUpO1xuICAgIHNpbS5sYXN0RGF0ZSA9IHNlcmlhbGl6YXRpb24ubGFzdERhdGU7XG4gICAgZm9yIChsZXQgcGVyc29uU2VyaWFsaXphdGlvbiBvZiBzZXJpYWxpemF0aW9uLnBlcnNvbnMpIHtcbiAgICAgICAgc2ltLmFkZFBlcnNvbihuZXcgUGVyc29uKFxuICAgICAgICAgICAgcGVyc29uU2VyaWFsaXphdGlvbi5uYW1lLFxuICAgICAgICAgICAgcGVyc29uU2VyaWFsaXphdGlvbi51bnRyYWNrZWRGcmVxdWVuY3ksXG4gICAgICAgICAgICBwZXJzb25TZXJpYWxpemF0aW9uLnVudHJhY2tlZEludGVuc2l0eSxcbiAgICAgICAgICAgIGV2YWwocGVyc29uU2VyaWFsaXphdGlvbi5hY3Rpdml0eVN0cmluZylcbiAgICAgICAgKSlcbiAgICB9XG4gICAgY29uc3QgcGVyc29uRnJvbU5hbWUgPSAobmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICAgIGZvciAobGV0IHBlcnNvbiBvZiBzaW0ucGVyc29ucylcbiAgICAgICAgICAgIGlmIChwZXJzb24ubmFtZSA9PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBlcnNvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGZvciAobGV0IGMgb2Ygc2VyaWFsaXphdGlvbi5jb250YWN0cykge1xuICAgICAgICBzaW0uYWRkQ29udGFjdChuZXcgQ29udGFjdChcbiAgICAgICAgICAgIHBlcnNvbkZyb21OYW1lKGMuYSksXG4gICAgICAgICAgICBwZXJzb25Gcm9tTmFtZShjLmIpLCB7XG4gICAgICAgICAgICBkYXRlOiBjLmRhdGUsXG4gICAgICAgICAgICBpbnRlbnNpdHk6IGMuaW50ZW5zaXR5XG4gICAgICAgIH1cbiAgICAgICAgKSlcbiAgICB9XG4gICAgZm9yIChsZXQgb2Igb2Ygc2VyaWFsaXphdGlvbi50ZXN0cykge1xuICAgICAgICBpZiAoaXNUZXN0U2VyaWFsaXphdGlvbihvYikpIHtcbiAgICAgICAgICAgIGNvbnN0IHRvQWRkID0gbmV3IFRlc3QoXG4gICAgICAgICAgICAgICAgcGVyc29uRnJvbU5hbWUob2IucGVyc29uKSxcbiAgICAgICAgICAgICAgICBvYi5kYXRlLFxuICAgICAgICAgICAgICAgIG9iLnBvc2l0aXZlLFxuICAgICAgICAgICAgICAgIG9iLnNlbnNpdGl2aXR5LFxuICAgICAgICAgICAgICAgIG9iLnNwZWNpZmljaXR5XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgdG9BZGQucmVsZXZhbnRUaW1lU3RhcnQgPSBvYi5yZWxldmFudFRpbWVTdGFydDtcbiAgICAgICAgICAgIHRvQWRkLnJlbGV2YW50VGltZUVuZCA9IG9iLnJlbGV2YW50VGltZUVuZDtcbiAgICAgICAgICAgIHNpbS5vYnNlcnZhdGlvbnMucHVzaCh0b0FkZCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2ltLnJlZnJlc2hDb250YWN0cygpO1xuICAgIHJldHVybiBzaW07XG59XG5cbmNvbnN0IGRhdGVLZXlzID0gbmV3IFNldChbXCJkYXRlXCIsIFwiaW5pdGlhbERhdGVcIiwgXCJsYXN0RGF0ZVwiLFwicmVsZXZhbnRUaW1lU3RhcnRcIixcInJlbGV2YW50VGltZUVuZFwiXSlcbmV4cG9ydCBmdW5jdGlvbiB0cnlQYXJzZVN0cmluZyhqc29uU3RyaW5nOiBzdHJpbmcpIHtcblxuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UoanNvblN0cmluZywgKGtleSwgdmFsKSA9PiB7XG4gICAgICAgIGlmIChkYXRlS2V5cy5oYXMoa2V5KSlcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZSh2YWwpO1xuICAgICAgICByZXR1cm4gdmFsXG4gICAgfSk7XG4gICAgaWYgKGlzU2ltdWxhdGlvblNlcmlhbGl6YXRpb24ocGFyc2VkKSkge1xuICAgICAgICBjb25zdCBzaW11bGF0aW9uID0gcmV2aXZlKHBhcnNlZCk7XG4gICAgICAgIHJldHVybiBzaW11bGF0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn0iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHRpZihfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdKSB7XG5cdFx0cmV0dXJuIF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0uZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlXG5fX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9zcmMvU2ltdWxhdGlvbldvcmtlci50c1wiKTtcbi8vIFRoaXMgZW50cnkgbW9kdWxlIHVzZWQgJ2V4cG9ydHMnIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbiJdLCJzb3VyY2VSb290IjoiIn0=