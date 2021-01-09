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
    date: new Date(date.getTime() + 2 * person.untrackedFrequency * Math.random() * 1000 * 60 * 60 * 24),
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9TaW11bGF0aW9uV29ya2VyLnRzIiwid2VicGFjazovL2Nvdmlkc2ltLy4vc3JjL2xvZ2ljL0NvbnRhY3QudHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvUGVyc29uLnRzIiwid2VicGFjazovL2Nvdmlkc2ltLy4vc3JjL2xvZ2ljL1NpbXVsYXRpb24udHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvVGVzdC50cyIsIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9sb2dpYy9WaXJ1cy50cyIsIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9sb2dpYy9jb25zdGFudHMudHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvc2ltdWxhdGlvblNlcmlhbGl6YXRpb24udHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vY292aWRzaW0vd2VicGFjay9zdGFydHVwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLGdHQUFnRDtBQUNoRCx1SUFBbUY7QUFFbkYsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUM7QUFDcEMsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLENBQUM7QUFDdEMsSUFBSSxpQkFBaUIsR0FBRyxNQUFNLENBQUM7QUFDL0IsSUFBSSxVQUFVLEdBQUcsR0FBRyxDQUFDO0FBQ3JCLElBQUksU0FBUyxHQUdBLElBQUksQ0FBQztBQUdsQixTQUFTLFFBQVEsQ0FBQyxJQUFTO0lBQ3ZCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUNqQixPQUFPLElBQUksQ0FBQztLQUNmO0lBQ0QsT0FBTyxLQUFLLENBQUM7QUFDakIsQ0FBQztBQUNELFNBQVMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFO0lBQ2YsSUFBSSxtREFBeUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDcEMsTUFBTSxV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QTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7O1VDckJBO1VBQ0E7VUFDQTtVQUNBIiwiZmlsZSI6Indvcmtlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBlcnNvbiB9IGZyb20gXCIuL2xvZ2ljL1BlcnNvblwiO1xuaW1wb3J0IHsgU2ltdWxhdGlvbiB9IGZyb20gXCIuL2xvZ2ljL1NpbXVsYXRpb25cIjtcbmltcG9ydCB7IGlzU2ltdWxhdGlvblNlcmlhbGl6YXRpb24sIHJldml2ZSB9IGZyb20gXCIuL2xvZ2ljL3NpbXVsYXRpb25TZXJpYWxpemF0aW9uXCJcblxuY29uc3QgbWF4U2ltdWxhdGlvblJ1bnMgPSAxMDAwMDAwMDA7XG5jb25zdCBncmFwaGljc1VwZGF0ZUludGVydmFsID0gMTAwMDAwO1xubGV0IGV4YWN0bmVzVGhyZXNob2xkID0gMC4wMDAxO1xubGV0IHJlc29sdXRpb24gPSAwLjE7XG5sZXQgbGFzdEFycmF5OiB7XG4gICAgZGF0ZTogRGF0ZTtcbiAgICB2YWx1ZXM6IG51bWJlcltdO1xufVtdIHwgbnVsbCA9IG51bGw7XG5cblxuZnVuY3Rpb24gaXNDb25maWcoZGF0YTogYW55KTogZGF0YSBpcyB7IHJlc29sdXRpb246IG51bWJlciAsIGFjY3VyYWN5Om51bWJlcn0ge1xuICAgIGlmIChkYXRhLnJlc29sdXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbm9ubWVzc2FnZSA9IChldikgPT4ge1xuICAgIGlmIChpc1NpbXVsYXRpb25TZXJpYWxpemF0aW9uKGV2LmRhdGEpKSB7XG4gICAgICAgIGNvbnN0IHNpbXVsYXRpb24gPSByZXZpdmUoZXYuZGF0YSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdHM6IHtcbiAgICAgICAgICAgIHByb2JhYmlsaXR5OiBudW1iZXI7XG4gICAgICAgICAgICByZXN1bHQ6IE1hcDxQZXJzb24sIERhdGU+O1xuICAgICAgICB9W10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBtYXhTaW11bGF0aW9uUnVuczsgaSsrKSB7XG4gICAgICAgICAgICByZXN1bHRzLnB1c2goc2ltdWxhdGlvbi5zaW11bGF0ZU9uY2UoKSk7XG4gICAgICAgICAgICBpZiAoaSAlIGdyYXBoaWNzVXBkYXRlSW50ZXJ2YWwgPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NlZCA9IHNpbXVsYXRpb24ucHJvY2Vzc1NpbXVsYXRpb25SZXN1bHRzKHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFycmF5ID0gU2ltdWxhdGlvbi50b0FycmF5KHByb2Nlc3NlZCwgcmVzb2x1dGlvbiwgc2ltdWxhdGlvbi5sYXN0RGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICAgICAgICAgICAgICAgIGFycmF5OiBhcnJheSxcbiAgICAgICAgICAgICAgICAgICAgcGVyc29uczogc2ltdWxhdGlvbi5wZXJzb25BcnJheS5tYXAocGVyc29uID0+IHBlcnNvbi5uYW1lKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBjdHg6IFdvcmtlciA9IHNlbGYgYXMgYW55O1xuICAgICAgICAgICAgICAgIGN0eC5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBpZiAobGFzdEFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY2hlY2sgZm9yIGRpZmZlcmVuY2UgYW5kIGJyZWFrIGlmIHNtYWxsIGVub3VnaFxuICAgICAgICAgICAgICAgICAgICBsZXQgZGlmZmVyZW5jZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhcG9pbnQgPSBhcnJheVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhc3REYXRhcG9pbnQgPSBsYXN0QXJyYXlbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGRhdGFwb2ludC52YWx1ZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmZXJlbmNlICs9IE1hdGguYWJzKGRhdGFwb2ludC52YWx1ZXNbal0gLSBsYXN0RGF0YXBvaW50LnZhbHVlc1tqXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGlmZmVyZW5jZSAvPSBsYXN0QXJyYXkubGVuZ3RoICogbGFzdEFycmF5WzBdLnZhbHVlcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRpZmZlcmVuY2UpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlmZmVyZW5jZSA8IGV4YWN0bmVzVGhyZXNob2xkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGFzdEFycmF5ID0gYXJyYXk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9ZWxzZSBpZihpc0NvbmZpZyhldi5kYXRhKSl7XG4gICAgICAgIHJlc29sdXRpb249ZXYuZGF0YS5yZXNvbHV0aW9uO1xuICAgICAgICBleGFjdG5lc1RocmVzaG9sZD1ldi5kYXRhLmFjY3VyYWN5O1xuICAgIH1cbn0iLCJpbXBvcnQge1BlcnNvbn0gZnJvbSBcIi4vUGVyc29uXCI7XG5cbi8qKlxuICogQGNsYXNzXG4gKiBAcHJvcGVydHkge251bWJlcj99IGludGVuc2l0eSAtIFByb2JhYmlsaXR5IG9mIGluZmVjdGluZyB0aGUgb3RoZXIgb25lXG4gKiBAcHJvcGVydHkge0RhdGU/fSBkYXRlXG4gKi9cbmNsYXNzIENvbnRhY3RPcHRpb25ze1xuICAgIGludGVuc2l0eTpudW1iZXI9MC41O1xuICAgIGRhdGU6RGF0ZT1uZXcgRGF0ZSgpO1xufVxuXG4vKipcbiAqIEBjbGFzc1xuICogQGV4dGVuZHMge0NvbnRhY3RPcHRpb25zfVxuICovXG5leHBvcnQgY2xhc3MgQ29udGFjdCBleHRlbmRzIENvbnRhY3RPcHRpb25ze1xuICAgIGE6IFBlcnNvbjtcbiAgICBiOiBQZXJzb247XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtQZXJzb259IGEgXG4gICAgICogQHBhcmFtIHtQZXJzb259IGIgXG4gICAgICogQHBhcmFtIHtDb250YWN0T3B0aW9uc30gb3B0aW9ucyBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhOiBQZXJzb24sYjogUGVyc29uLG9wdGlvbnM6IENvbnRhY3RPcHRpb25zKXtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5hPWE7XG4gICAgICAgIHRoaXMuYj1iO1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMsb3B0aW9ucyk7XG4gICAgfVxuICAgIHByb2Nlc3MoKXtcbiAgICAgICAgXG4gICAgfVxufSIsImltcG9ydCB7IGFsZ29yaXRobWljQ29uc3RhbnRzIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbi8qKlxuICogQHR5cGVkZWYgeyhkYXRlOkRhdGUpPT57Y29udGFjdERlbnNpdHk6bnVtYmVyLGNvbnRhY3RJbnRlbnNpdHk6bnVtYmVyfX0gdW50cmFja2VkQWN0aXZpdHlcbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIFVudHJhY2tlZENvbnRhY3QgIHtcbiAgICAvKiotZGF0ZSBhdCB3aGljaCB0aGUgY29udGFjdCB0YWtlcyBwbGFjZSAqL1xuICAgIGRhdGU6IERhdGU7XG4gICAgLyoqcGVyc29uIGhhdmluZyBhbiB1bnRyYWNrZWQgY29udGFjdCAqL1xuICAgIHBlcnNvbjogUGVyc29uO1xuICAgIC8qKnByb2JhYmlsaXR5IG9mIHRyYW5zbWlzc2lvbiBpZiBvbmUgb2YgdGhlIHBlcnNvbnMgaXMgaW5mZWN0ZWQgYW5kIHRoZSBvdGhlciBvbmUgbm90ICovXG4gICAgaW50ZW5zaXR5OiBudW1iZXI7XG4gICAgLyoqd2hldGhlciBvdGhlciBwZXJzb24gaXMgaW5mZWN0ZWQgYWN1dGVseSAqL1xuICAgIGFjdXRlSW5mZWN0ZWQ6IGJvb2xlYW47XG4gICAgLyoqd2hldGhlciB0aGUgb3RoZXIgcGVyc29uIHdhcyBpbmZlY3RlZCBhdCBhbnkgcG9pbnQgaW4gdGltZSAqL1xuICAgIGV2ZXJJbmZlY3RlZDogYm9vbGVhbjtcbn1cbi8qKiBnZW5lcmF0ZXMgbmV4dCB1bnRyYWNrZWQgY29udGFjdCBzdGFydGluZyBhdCBhIGdpdmVuIGRhdGUgKi9cbmV4cG9ydCB0eXBlIHVudHJhY2tlZENvbnRhY3RHZW5lcmF0b3I9KGRhdGU6RGF0ZSxwZXJzb246UGVyc29uKT0+VW50cmFja2VkQ29udGFjdDtcblxuY29uc3QgZGVmYXVsdENvbnRhY3RHZW5lcmF0b3I6dW50cmFja2VkQ29udGFjdEdlbmVyYXRvciA9IChkYXRlOiBEYXRlLCBwZXJzb246IFBlcnNvbikgPT4gKHtcbiAgICBkYXRlOiBuZXcgRGF0ZShkYXRlLmdldFRpbWUoKSArIDIgKiBwZXJzb24udW50cmFja2VkRnJlcXVlbmN5ICogTWF0aC5yYW5kb20oKSAqIDEwMDAqNjAqNjAqMjQpLFxuICAgIGFjdXRlSW5mZWN0ZWQ6IDAuMDAxID4gTWF0aC5yYW5kb20oKSxcbiAgICBldmVySW5mZWN0ZWQ6IDAuMDEgPiBNYXRoLnJhbmRvbSgpLFxuICAgIGludGVuc2l0eTogMiAqIE1hdGgucmFuZG9tKCkgKiBwZXJzb24udW50cmFja2VkSW50ZW5zaXR5LFxuICAgIHBlcnNvbjogcGVyc29uXG59KTtcbi8qKlxuICogQ2xhc3MgcmVwcmVzZW50aW5nIHBlcnNvbnMgaW4gdGhlIHJlYWwgd29ybGQuXG4gKi9cbmV4cG9ydCBjbGFzcyBQZXJzb24ge1xuICAgIG5hbWU6IHN0cmluZztcbiAgICB1bnRyYWNrZWRGcmVxdWVuY3k6IG51bWJlcjtcbiAgICB1bnRyYWNrZWRJbnRlbnNpdHk6IG51bWJlcjtcbiAgICBleHRlcm5hbEFjdGl2aXR5OiB1bnRyYWNrZWRDb250YWN0R2VuZXJhdG9yO1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAgICogQHBhcmFtIHt1bnRyYWNrZWRDb250YWN0R2VuZXJhdG9yfSBleHRlcm5hbEFjdGl2aXR5IC0gZ2VuZXJhdGVzIG5leHQgY29udGFjdCBvZiBwZXJzb24gc3RhcnRpbmcgYXQgZ2l2ZW4gZGF0ZVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgdW50cmFja2VkRnJlcXVlbmN5ID0gMSwgdW50cmFja2VkSW50ZW5zaXR5ID0gMC4xLCBleHRlcm5hbEFjdGl2aXR5OnVudHJhY2tlZENvbnRhY3RHZW5lcmF0b3IgPSBkZWZhdWx0Q29udGFjdEdlbmVyYXRvcikge1xuICAgICAgICB0aGlzLmV4dGVybmFsQWN0aXZpdHkgPSBleHRlcm5hbEFjdGl2aXR5O1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLnVudHJhY2tlZEZyZXF1ZW5jeSA9IHVudHJhY2tlZEZyZXF1ZW5jeTtcbiAgICAgICAgdGhpcy51bnRyYWNrZWRJbnRlbnNpdHkgPSB1bnRyYWNrZWRJbnRlbnNpdHk7XG4gICAgfVxufSIsImltcG9ydCB7IFBlcnNvbiwgVW50cmFja2VkQ29udGFjdCB9IGZyb20gXCIuL1BlcnNvblwiO1xuaW1wb3J0IHsgQ29udGFjdCB9IGZyb20gXCIuL0NvbnRhY3RcIjtcbmltcG9ydCB7IFZpcnVzIH0gZnJvbSBcIi4vVmlydXNcIjtcbmltcG9ydCB7IE9ic2VydmF0aW9uLCBUZXN0IH0gZnJvbSBcIi4vVGVzdFwiO1xuaW1wb3J0IHsgYWxnb3JpdGhtaWNDb25zdGFudHMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzVW50cmFja2VkKGNvbnRhY3Q6IFVudHJhY2tlZENvbnRhY3QgfCBDb250YWN0KTogY29udGFjdCBpcyBVbnRyYWNrZWRDb250YWN0IHtcbiAgICByZXR1cm4gKGNvbnRhY3QgYXMgVW50cmFja2VkQ29udGFjdCkucGVyc29uICE9IG51bGw7XG59XG4vKipcbiAqIFNpbXVsYXRpb24gb2YgYW4gaW5mZWN0aW9uLiBQcm92aWRlcyB0aGUgZnVuY3Rpb25hbGl0eSB0byBzaW11bGF0ZSB0aGUgcGxvdCBtYW55IHRpbWVzIHRvIGFwcHJveGltYXRlIHByb2JhYmlsaXRpZXMgYXQgZ2l2ZW4gdGVzdCByZXN1bHRzXG4gKi9cbmV4cG9ydCBjbGFzcyBTaW11bGF0aW9uIHtcbiAgICBvYnNlcnZhdGlvbnM6IE9ic2VydmF0aW9uW107XG4gICAgaW5pdGlhbERhdGU6IERhdGU7XG4gICAgbGFzdERhdGU6IERhdGU7XG4gICAgcGVyc29uczogU2V0PFBlcnNvbj47XG4gICAgY29udGFjdHM6IENvbnRhY3RbXTtcbiAgICBwZXJzb25Ub0luaXRpYWxJbmZlY3Rpb25EYXRlOiBNYXA8UGVyc29uLCAoKSA9PiBEYXRlPjtcbiAgICBjb25zdHJ1Y3Rvcihpbml0aWFsRGF0ZTogRGF0ZSA9IG5ldyBEYXRlKCksIG9ic2VydmF0aW9uczogT2JzZXJ2YXRpb25bXSA9IFtdKSB7XG4gICAgICAgIHRoaXMub2JzZXJ2YXRpb25zID0gb2JzZXJ2YXRpb25zO1xuICAgICAgICB0aGlzLmluaXRpYWxEYXRlID0gaW5pdGlhbERhdGU7XG4gICAgICAgIHRoaXMubGFzdERhdGUgPSBpbml0aWFsRGF0ZTtcbiAgICAgICAgLyoqQHR5cGUge1NldDxQZXJzb24+fSovXG4gICAgICAgIHRoaXMucGVyc29ucyA9IG5ldyBTZXQoKTtcbiAgICAgICAgLyoqIEB0eXBlIHtDb250YWN0W119ICovXG4gICAgICAgIHRoaXMuY29udGFjdHMgPSBbXTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFzc2lnbnMgYSBmdW5jdGlvbiB0byBlYWNoIHBlcnNvbiB3aGljaCBnZW5lcmF0ZXMgYW4gaW5pdGlhbCBpbmZlY3Rpb24gZGF0ZSAob3IgbnVsbCBpZiBubyBpbmZlY3Rpb24gaGFwcGVuZWQpXG4gICAgICAgICAqIEB0eXBlIHtNYXA8UGVyc29uLCgpPT5EYXRlP31cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucGVyc29uVG9Jbml0aWFsSW5mZWN0aW9uRGF0ZSA9IG5ldyBNYXAoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtQZXJzb259IHBlcnNvbiBcbiAgICAgKiBAcGFyYW0geygpPT5EYXRlP30gZGF0ZUdlbmVyYXRvciAtZnVuY3Rpb24gd2hpY2ggZ2VuZXJhdGVzIGFuIGluaXRpYWwgaW5mZWN0aW9uIGRhdGUgKG9yIG51bGwgaWYgbm8gaW5mZWN0aW9uIGhhcHBlbmVkKVxuICAgICAqL1xuICAgIHNldEluZmVjdGlvbkRhdGVGdW5jdGlvbihwZXJzb246IFBlcnNvbiwgZGF0ZUdlbmVyYXRvcjogKCkgPT4gRGF0ZSB8IG51bGwpIHtcbiAgICAgICAgdGhpcy5wZXJzb25Ub0luaXRpYWxJbmZlY3Rpb25EYXRlLnNldChwZXJzb24sIGRhdGVHZW5lcmF0b3IpO1xuICAgIH1cbiAgICAvKipAcGFyYW0ge1BlcnNvbn0gdG9BZGQgKi9cbiAgICBhZGRQZXJzb24odG9BZGQ6IFBlcnNvbikge1xuICAgICAgICB0aGlzLnBlcnNvbnMuYWRkKHRvQWRkKTtcblxuICAgICAgICB0aGlzLnBlcnNvblRvSW5pdGlhbEluZmVjdGlvbkRhdGUuc2V0KHRvQWRkLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuMDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUodGhpcy5pbml0aWFsRGF0ZS5nZXRUaW1lKCkgLSBNYXRoLnJhbmRvbSgpICogMTAwICogYWxnb3JpdGhtaWNDb25zdGFudHMuZGF5VG9NUyk7Ly9yYW5kb20gZGF5IGluIHRoZSBsYXN0IDEwMCBkYXlzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKiBAcGFyYW0ge0NvbnRhY3R9IHRvQWRkIC0gY29udGFjdCB0byBiZSBhZGRlZCB0byB0aGUgcHJvY2Vzc2lvbiBsaXN0ICovXG4gICAgYWRkQ29udGFjdCh0b0FkZDogQ29udGFjdCkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY29udGFjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0b0FkZC5kYXRlLmdldFRpbWUoKSA8IHRoaXMuY29udGFjdHNbaV0uZGF0ZS5nZXRUaW1lKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRhY3RzLnNwbGljZShpLCAwLCB0b0FkZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5wZXJzb25zLmFkZCh0b0FkZC5hKTtcbiAgICAgICAgICAgICAgICB0aGlzLnBlcnNvbnMuYWRkKHRvQWRkLmIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbnRhY3RzLnB1c2godG9BZGQpO1xuICAgICAgICB0aGlzLmFkZFBlcnNvbih0b0FkZC5hKTtcbiAgICAgICAgdGhpcy5hZGRQZXJzb24odG9BZGQuYik7XG4gICAgICAgIGlmICh0aGlzLmxhc3REYXRlIDwgdG9BZGQuZGF0ZSlcbiAgICAgICAgICAgIHRoaXMubGFzdERhdGUgPSB0b0FkZC5kYXRlO1xuICAgIH1cbiAgICAvKipvcmRlciBjb250YWN0cyB0byBhdm9pZCBhbnkgZXJyb3JzICovXG4gICAgcmVmcmVzaENvbnRhY3RzKCkge1xuICAgICAgICB0aGlzLmNvbnRhY3RzLnNvcnQoKGEsIGIpID0+IGEuZGF0ZS5nZXRUaW1lKCkgLSBiLmRhdGUuZ2V0VGltZSgpKTtcbiAgICAgICAgaWYgKHRoaXMuY29udGFjdHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgbmV3TGFzdERhdGUgPSB0aGlzLmNvbnRhY3RzW3RoaXMuY29udGFjdHMubGVuZ3RoIC0gMV0uZGF0ZTtcbiAgICAgICAgICAgIGlmKG5ld0xhc3REYXRlPnRoaXMubGFzdERhdGUpXG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0RGF0ZT1uZXdMYXN0RGF0ZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBvIG9mIHRoaXMub2JzZXJ2YXRpb25zKSB7XG4gICAgICAgICAgICBpZiAobyBpbnN0YW5jZW9mIFRlc3QgJiYgby5kYXRlICYmIG8uZGF0ZSA+IHRoaXMubGFzdERhdGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxhc3REYXRlID0gby5kYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmNvbnRhY3RzLmxlbmd0aCA+IDAgJiYgdGhpcy5pbml0aWFsRGF0ZSA+IHRoaXMuY29udGFjdHNbMF0uZGF0ZSkge1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsRGF0ZSA9IHRoaXMuY29udGFjdHNbMF0uZGF0ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzaW11bGF0ZU9uY2UoKSB7XG4gICAgICAgIGNvbnN0IGxhc3REYXRlVG9TaW11bGF0ZSA9IHRoaXMubGFzdERhdGU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAdHlwZSB7TWFwPFBlcnNvbixEYXRlPn1cbiAgICAgICAgICovXG4gICAgICAgIGNvbnN0IHJlc3VsdDogTWFwPFBlcnNvbiwgRGF0ZT4gPSBuZXcgTWFwKCk7XG4gICAgICAgIC8qKkB0eXBlIHtVbnRyYWNrZWRDb250YWN0fENvbnRhY3QpW119ICovXG4gICAgICAgIGNvbnN0IGV2ZW50czogKFVudHJhY2tlZENvbnRhY3QgfCBDb250YWN0KVtdID0gbmV3IEFycmF5KC4uLnRoaXMuY29udGFjdHMpO1xuICAgICAgICAvKipAdHlwZSB7KGNvbnRhY3Q6aW1wb3J0KFwiLi9QZXJzb24uanNcIikuVW50cmFja2VkQ29udGFjdCk9PnZvaWR9ICovXG4gICAgICAgIGNvbnN0IGFkZFVudHJhY2tlZENvbnRhY3Q6IChjb250YWN0OiBVbnRyYWNrZWRDb250YWN0KSA9PiB2b2lkID0gKGNvbnN0YWN0KTogdm9pZCA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRlID0gY29uc3RhY3QuZGF0ZTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgaW4gZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50c1tpXS5kYXRlID4gZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBldmVudHMuc3BsaWNlKE51bWJlci5wYXJzZUludChpKSwgMCwgY29uc3RhY3QpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXZlbnRzLnB1c2goY29uc3RhY3QpO1xuICAgICAgICB9O1xuICAgICAgICBmb3IgKGxldCBwZXJzb24gb2YgdGhpcy5wZXJzb25zKSB7XG4gICAgICAgICAgICBjb25zdCBpbml0aWFsRGF0ZSA9IHRoaXMucGVyc29uVG9Jbml0aWFsSW5mZWN0aW9uRGF0ZS5nZXQocGVyc29uKSgpO1xuICAgICAgICAgICAgcmVzdWx0LnNldChwZXJzb24sIGluaXRpYWxEYXRlKTtcbiAgICAgICAgICAgIGZvciAobGV0IGNvbnRhY3QgPSBwZXJzb24uZXh0ZXJuYWxBY3Rpdml0eSh0aGlzLmluaXRpYWxEYXRlLCBwZXJzb24pOyBjb250YWN0LmRhdGUgPCBsYXN0RGF0ZVRvU2ltdWxhdGU7IGNvbnRhY3QgPSBwZXJzb24uZXh0ZXJuYWxBY3Rpdml0eShjb250YWN0LmRhdGUsIHBlcnNvbikpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29udGFjdC5hY3V0ZUluZmVjdGVkKVxuICAgICAgICAgICAgICAgICAgICBhZGRVbnRyYWNrZWRDb250YWN0KGNvbnRhY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGNvbnRhY3Qgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICBpZiAoaXNVbnRyYWNrZWQoY29udGFjdCkpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnRhY3QgaXMgdW50cmFja2VkLiBUaGlzIGlzIG9ubHkgdHJpZ2dlcmVkIGlmIHRoZSBvdGhlciBwZXJzb24gaXMgaW5mZWN0ZWRcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5nZXQoY29udGFjdC5wZXJzb24pICYmIE1hdGgucmFuZG9tKCkgPCBjb250YWN0LmludGVuc2l0eSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0KGNvbnRhY3QucGVyc29uLCBjb250YWN0LmRhdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vY29udGFjdCBpcyB0cmFja2VkXG4gICAgICAgICAgICBjb25zdCBhRGF0ZSA9IHJlc3VsdC5nZXQoY29udGFjdC5hKTtcbiAgICAgICAgICAgIGNvbnN0IGJEYXRlID0gcmVzdWx0LmdldChjb250YWN0LmIpO1xuICAgICAgICAgICAgLy8gaWYgYm90aCBvciBub25lIGlzIGluZmVjdGVkIG5vdGhpbmcgaGFwcGVuc1xuICAgICAgICAgICAgaWYgKGFEYXRlICYmIGJEYXRlIHx8ICFhRGF0ZSAmJiAhYkRhdGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBpZiAoYURhdGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9iYWJpbGl0eU9mSW5mZWN0aW9uID0gY29udGFjdC5pbnRlbnNpdHkgKiBWaXJ1cy5nZXRQcm9iYWJpbGl0eU9mSW5mZWN0aW91c25lc3MoYURhdGUsIGNvbnRhY3QuZGF0ZSk7XG4gICAgICAgICAgICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPCBwcm9iYWJpbGl0eU9mSW5mZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXQoY29udGFjdC5iLCBjb250YWN0LmRhdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChiRGF0ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2JhYmlsaXR5T2ZJbmZlY3Rpb24gPSBjb250YWN0LmludGVuc2l0eSAqIFZpcnVzLmdldFByb2JhYmlsaXR5T2ZJbmZlY3Rpb3VzbmVzcyhiRGF0ZSwgY29udGFjdC5kYXRlKTtcbiAgICAgICAgICAgICAgICBpZiAocHJvYmFiaWxpdHlPZkluZmVjdGlvbiA8PSAwKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IHByb2JhYmlsaXR5T2ZJbmZlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldChjb250YWN0LmEsIGNvbnRhY3QuZGF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxldCBwcm9iYWJpbGl0eSA9IDE7XG4gICAgICAgIGZvciAobGV0IG9ic2VydmF0aW9uIG9mIHRoaXMub2JzZXJ2YXRpb25zKSB7XG4gICAgICAgICAgICBwcm9iYWJpbGl0eSAqPSBvYnNlcnZhdGlvbi5nZXRQcm9iYWJpbGl0eShyZXN1bHQuZ2V0KG9ic2VydmF0aW9uLnBlcnNvbikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwcm9iYWJpbGl0eTogcHJvYmFiaWxpdHksXG4gICAgICAgICAgICByZXN1bHQ6IHJlc3VsdFxuICAgICAgICB9O1xuICAgIH1cbiAgICBwcm9jZXNzU2ltdWxhdGlvblJlc3VsdHMocmVzdWx0czogeyByZXN1bHQ6IE1hcDxQZXJzb24sIERhdGU+OyBwcm9iYWJpbGl0eTogbnVtYmVyOyB9W10pIHtcblxuICAgICAgICBsZXQgcHJvYmFiaWxpdHlTdW0gPSAwO1xuICAgICAgICBmb3IgKGxldCByZXN1bHQgb2YgcmVzdWx0cylcbiAgICAgICAgICAgIHByb2JhYmlsaXR5U3VtICs9IHJlc3VsdC5wcm9iYWJpbGl0eTtcbiAgICAgICAgLyoqQHR5cGUge01hcDxQZXJzb24sbnVtYmVyPn0gKi9cbiAgICAgICAgY29uc3QgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eTogTWFwPFBlcnNvbiwgbnVtYmVyPiA9IG5ldyBNYXAoKTtcbiAgICAgICAgZm9yIChsZXQgcGVyc29uIG9mIHRoaXMucGVyc29ucykge1xuICAgICAgICAgICAgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eS5zZXQocGVyc29uLCAwKTtcbiAgICAgICAgfVxuICAgICAgICAvKipAdHlwZSB7TWFwPFBlcnNvbix7ZGF0ZTpEYXRlLHA6bnVtYmVyLCBwQWNjOm51bWJlcj99W10+fSAqL1xuICAgICAgICBjb25zdCBpbmZlY3Rpb25EYXRlczogTWFwPFBlcnNvbiwgeyBkYXRlOiBEYXRlOyBwOiBudW1iZXI7IHBBY2M6IG51bWJlciB8IG51bGw7IH1bXT4gPSBuZXcgTWFwKCk7XG4gICAgICAgIGZvciAobGV0IHBlcnNvbiBvZiB0aGlzLnBlcnNvbnMpXG4gICAgICAgICAgICBpbmZlY3Rpb25EYXRlcy5zZXQocGVyc29uLCBbXSk7XG4gICAgICAgIGZvciAobGV0IHJlc3VsdCBvZiByZXN1bHRzKSB7XG4gICAgICAgICAgICBjb25zdCByZWFsUHJvYiA9IHJlc3VsdC5wcm9iYWJpbGl0eSAvIHByb2JhYmlsaXR5U3VtO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBwZXJzb24gb2YgdGhpcy5wZXJzb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5yZXN1bHQuZ2V0KHBlcnNvbikpXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsSW5mZWN0aW9uUHJvYmFiaWxpdHkuc2V0KHBlcnNvbiwgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eS5nZXQocGVyc29uKSArIHJlYWxQcm9iKTtcbiAgICAgICAgICAgICAgICBpbmZlY3Rpb25EYXRlcy5nZXQocGVyc29uKS5wdXNoKHsgZGF0ZTogcmVzdWx0LnJlc3VsdC5nZXQocGVyc29uKSwgcDogcmVhbFByb2IsIHBBY2M6IG51bGwgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgcGVyc29uIG9mIHRoaXMucGVyc29ucykge1xuICAgICAgICAgICAgY29uc3QgaW5mZWN0aW9uRGF0ZXNQZXJzb24gPSBpbmZlY3Rpb25EYXRlcy5nZXQocGVyc29uKTtcbiAgICAgICAgICAgIGluZmVjdGlvbkRhdGVzUGVyc29uLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWEuZGF0ZSAmJiAhYi5kYXRlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgICBpZiAoIWEuZGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgaWYgKCFiLmRhdGUpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5kYXRlLmdldFRpbWUoKSAtIGIuZGF0ZS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGxldCBhY2N1bXVsYXRlZFByb2IgPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgZGF0ZSBvZiBpbmZlY3Rpb25EYXRlc1BlcnNvbikge1xuICAgICAgICAgICAgICAgIGFjY3VtdWxhdGVkUHJvYiArPSBkYXRlLnA7XG4gICAgICAgICAgICAgICAgZGF0ZS5wQWNjID0gYWNjdW11bGF0ZWRQcm9iO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGluaXRpYWxEYXRlOiB0aGlzLmluaXRpYWxEYXRlLFxuICAgICAgICAgICAgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eTogdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eSxcbiAgICAgICAgICAgIGluZmVjdGlvblRpbWVsaW5lOiBpbmZlY3Rpb25EYXRlc1xuICAgICAgICB9O1xuICAgIH1cbiAgICBzaW11bGF0ZShydW5zOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0czogeyByZXN1bHQ6IE1hcDxQZXJzb24sIERhdGU+OyBwcm9iYWJpbGl0eTogbnVtYmVyOyB9W10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBydW5zOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuc2ltdWxhdGVPbmNlKCk7XG4gICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzU2ltdWxhdGlvblJlc3VsdHMocmVzdWx0cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY29tcHV0ZXMgYW4gYXJyYXkgcmVwcmVzZW50YXRpb24gb2YgdGhlIHNpbXVsYXRpb24gcmVzdWx0c1xuICAgICAqIEBwYXJhbSByZXN1bHQgLXNpbXVsYXRpb24gcmVzdWx0IG9iamVjdFxuICAgICAqIEBwYXJhbSByZXNvbHV0aW9uIC0gbnVtYmVyIG9mIGRhdGFwb2ludHMgdG8gc2hvdyBwZXIgZGF5XG4gICAgICogQHBhcmFtIGxhc3REYXRlIC0gbGFzdCBkYXRlIHRvIHNpbXVsYXRlIGluIG1zIGZyb20gMTk3MFxuICAgICAqL1xuICAgIHN0YXRpYyB0b0FycmF5KHJlc3VsdDoge1xuICAgICAgICBpbml0aWFsRGF0ZTogRGF0ZTtcbiAgICAgICAgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eTogTWFwPFBlcnNvbiwgbnVtYmVyPjtcbiAgICAgICAgaW5mZWN0aW9uVGltZWxpbmU6IE1hcDxQZXJzb24sIHtcbiAgICAgICAgICAgIGRhdGU6IERhdGU7XG4gICAgICAgICAgICBwOiBudW1iZXI7XG4gICAgICAgICAgICBwQWNjOiBudW1iZXI7XG4gICAgICAgIH1bXT47XG4gICAgfSwgcmVzb2x1dGlvbjogbnVtYmVyLCBsYXN0RGF0ZTogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHBlcnNvbkFycmF5ID0gbmV3IEFycmF5KC4uLnJlc3VsdC5pbmZlY3Rpb25UaW1lbGluZS5rZXlzKCkpO1xuICAgICAgICBjb25zdCBsaXN0OiB7IGRhdGU6IERhdGUsIHZhbHVlczogbnVtYmVyW10gfVtdID0gW11cbiAgICAgICAgY29uc3QgaW5kaWNlcyA9IHBlcnNvbkFycmF5Lm1hcCgocGVyc29uKSA9PiAwKTtcbiAgICAgICAgZm9yIChsZXQgZGF0ZSA9IHJlc3VsdC5pbml0aWFsRGF0ZTsgZGF0ZS5nZXRUaW1lKCkgPCBsYXN0RGF0ZTsgZGF0ZSA9IG5ldyBEYXRlKGRhdGUuZ2V0VGltZSgpICsgcmVzb2x1dGlvbiAqIDEwMDAgKiA2MCAqIDYwICogMjQpKSB7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZXMgPSBuZXcgQXJyYXkocGVyc29uQXJyYXkubGVuZ3RoKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGVyc29uQXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwZXJzb24gPSBwZXJzb25BcnJheVtpXTtcbiAgICAgICAgICAgICAgICBjb25zdCBwZXJzb25WYWx1ZXMgPSByZXN1bHQuaW5mZWN0aW9uVGltZWxpbmUuZ2V0KHBlcnNvbik7XG4gICAgICAgICAgICAgICAgbGV0IGluZGV4ID0gaW5kaWNlc1tpXTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaW5kZXggKyAxIDwgcGVyc29uVmFsdWVzLmxlbmd0aCAmJiBwZXJzb25WYWx1ZXNbaW5kZXggKyAxXS5kYXRlICYmIHBlcnNvblZhbHVlc1tpbmRleCArIDFdLmRhdGUgPCBkYXRlKVxuICAgICAgICAgICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgICAgIGluZGljZXNbaV0gPSBpbmRleDtcbiAgICAgICAgICAgICAgICBuZXdWYWx1ZXNbaV0gPSBwZXJzb25WYWx1ZXNbaW5kZXhdLnBBY2M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsaXN0LnB1c2goeyBkYXRlOiBkYXRlLCB2YWx1ZXM6IG5ld1ZhbHVlcyB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG5cblxuXG4gICAgLyoqcmV0dXJucyB0aGUgcGVyc29ucyBhcyBhcnJheSB0byBiZSBhYmxlIHRvIHVzZSBBcnJheS5tYXAgZXRjICovXG4gICAgZ2V0IHBlcnNvbkFycmF5KCkge1xuICAgICAgICByZXR1cm4gbmV3IEFycmF5KC4uLnRoaXMucGVyc29ucyk7XG4gICAgfVxufSIsImltcG9ydCB7IFZpcnVzIH0gZnJvbSBcIi4vVmlydXNcIjtcbmltcG9ydCB7IFBlcnNvbiB9IGZyb20gXCIuL1BlcnNvblwiO1xuaW1wb3J0IHsgYWxnb3JpdGhtaWNDb25zdGFudHMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuZXhwb3J0IGNsYXNzIE9ic2VydmF0aW9uIHtcbiAgICBwZXJzb246IFBlcnNvbjtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge1BlcnNvbn0gcGVyc29uIFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHBlcnNvbjogUGVyc29uKSB7XG4gICAgICAgIHRoaXMucGVyc29uID0gcGVyc29uO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0RhdGU/fSBkYXRlT2ZJbmZlY3Rpb24gLSBkYXRlIGF0IHdoaWNoIGFuIGluZmVjdGlvbiBvY2N1cnMgb3IgbnVsbCB3aGVuIGl0IGRvZXMgbm90IG9jY3VyXG4gICAgICogQHJldHVybnMge251bWJlcn0gcHJvYmFiaWxpdHkgdGhhdCB0aGlzIG9ic2VydmF0aW9uIG9jY3VycyBnaXZlbiBhbiBpbnZlY3Rpb25cbiAgICAgKi9cbiAgICBnZXRQcm9iYWJpbGl0eShkYXRlT2ZJbmZlY3Rpb246IERhdGUgfCBudWxsKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbn1cbi8qKlxuICogQHR5cGVkZWYge09iamVjdH0gVGVzdE9wdGlvbnNcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzZW5zaXRpdml0eVxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNwZWNpZmljaXR5XG4gKiBAcHJvcGVydHkge251bWJlcn0gdGltZVRcbiAqL1xuXG4vKipcbiAqIEBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgVGVzdCBleHRlbmRzIE9ic2VydmF0aW9uIHtcbiAgICBzdGFydE9ic2VydmFiaWxpdHk6IG51bWJlcjtcbiAgICBlbmRPYnNlcnZhYmlsaXR5OiBudW1iZXI7XG4gICAgcG9zaXRpdmU6IGJvb2xlYW47XG4gICAgc2Vuc2l0aXZpdHk6IG51bWJlcjtcbiAgICBzcGVjaWZpY2l0eTogbnVtYmVyO1xuICAgIGRhdGU6IERhdGU7XG4gICAgcmVsZXZhbnRUaW1lU3RhcnQ6IERhdGU7XG4gICAgcmVsZXZhbnRUaW1lRW5kOiBEYXRlO1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7UGVyc29ufSBwZXJzb25cbiAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgLSBkYXRlIG9mIHRoZSB0ZXN0XG4gICAgICogQHBhcmFtIHtib29sZWFufSBwb3NpdGl2ZSAtIHRydWUgaWYgdGhlIHJlc3VsdCBpcyBwb3NpdGl2ZVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHBlcnNvbjogUGVyc29uLCBkYXRlOiBEYXRlLCBwb3NpdGl2ZTogYm9vbGVhbiwgc2Vuc2l0aXZpdHkgPSAwLjk1LCBzcGVjaWZpY2l0eSA9IDAuOSwgc3RhcnRPYnNlcnZhYmlsaXR5ID0gMiwgZW5kT2JzZXJ2YWJpbGl0eSA9IDE0KSB7XG4gICAgICAgIHN1cGVyKHBlcnNvbik7XG4gICAgICAgIHRoaXMuc2V0RGF0ZShkYXRlKTtcbiAgICAgICAgdGhpcy5zdGFydE9ic2VydmFiaWxpdHkgPSBzdGFydE9ic2VydmFiaWxpdHk7XG4gICAgICAgIHRoaXMuZW5kT2JzZXJ2YWJpbGl0eSA9IGVuZE9ic2VydmFiaWxpdHk7XG4gICAgICAgIHRoaXMucG9zaXRpdmUgPSBwb3NpdGl2ZTtcbiAgICAgICAgdGhpcy5zZW5zaXRpdml0eSA9IHNlbnNpdGl2aXR5O1xuICAgICAgICB0aGlzLnNwZWNpZmljaXR5ID0gc3BlY2lmaWNpdHk7XG4gICAgfVxuICAgIHNldERhdGUoZGF0ZSA9IHRoaXMuZGF0ZSkge1xuICAgICAgICB0aGlzLmRhdGUgPSBkYXRlO1xuICAgICAgICB0aGlzLnJlbGV2YW50VGltZVN0YXJ0ID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgIHRoaXMucmVsZXZhbnRUaW1lU3RhcnQuc2V0RGF0ZShkYXRlLmdldERhdGUoKSAtIHRoaXMuZW5kT2JzZXJ2YWJpbGl0eSk7XG4gICAgICAgIHRoaXMucmVsZXZhbnRUaW1lRW5kID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgIHRoaXMucmVsZXZhbnRUaW1lRW5kLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgLSB0aGlzLnN0YXJ0T2JzZXJ2YWJpbGl0eSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RGF0ZT99IGRhdGVPZkluZmVjdGlvbiAtIGRhdGUgYXQgd2hpY2ggYW4gaW5mZWN0aW9uIG9jY3VycyBvciBudWxsIHdoZW4gaXQgZG9lcyBub3Qgb2NjdXJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBwcm9iYWJpbGl0eSB0aGF0IHRoaXMgb2JzZXJ2YXRpb24gb2NjdXJzIGdpdmVuIGFuIGludmVjdGlvblxuICAgICAqL1xuICAgIGdldFByb2JhYmlsaXR5KGRhdGVPZkluZmVjdGlvbjogRGF0ZSB8IG51bGwpOiBudW1iZXIge1xuICAgICAgICBpZiAoZGF0ZU9mSW5mZWN0aW9uICYmIGRhdGVPZkluZmVjdGlvbiA+IHRoaXMucmVsZXZhbnRUaW1lU3RhcnQgJiYgZGF0ZU9mSW5mZWN0aW9uIDwgdGhpcy5yZWxldmFudFRpbWVFbmQpIHtcbiAgICAgICAgICAgIC8vaW5mZWN0ZWRcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBvc2l0aXZlID8gdGhpcy5zZW5zaXRpdml0eSA6IDEgLSB0aGlzLnNwZWNpZmljaXR5O1xuICAgICAgICB9XG4gICAgICAgIC8vbm90IGluZmVjdGVkXG4gICAgICAgIHJldHVybiB0aGlzLnBvc2l0aXZlID8gKDEgLSB0aGlzLnNwZWNpZmljaXR5KSA6IHRoaXMuc2Vuc2l0aXZpdHk7XG4gICAgfVxufVxuLyoqXG4gKiBBIGxvZyBvZiB0aGUgc3ltcHRvbXMgYSBwZXJzb24gaGFzLiBOb3RlIHRoYXQgYSBsb2cgTVVTVCBjb250YWluIEFMTCBsb2dzIGFib3V0IG9uZSBwZXJzb24hXG4gKi9cbmV4cG9ydCBjbGFzcyBTeW1wdG9tTG9nIGV4dGVuZHMgT2JzZXJ2YXRpb24ge1xuICAgIGxvZzogTWFwPERhdGUsIG51bWJlcj47XG4gICAgZGF0ZXM6IERhdGVbXTtcbiAgICBtaW5EYXRlOiBEYXRlO1xuICAgIG1heERhdGU6IERhdGU7XG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtQZXJzb259IHBlcnNvblxuICAgICAqIEBwYXJhbSB7TWFwPERhdGUsbnVtYmVyPn0gbG9nIC0gbWFwcyBkYXRlcyBzdHJlbmd0aCBvZiBjb3ZpZC1zcGVjaWZpYyBzeW1wdG9tcyBvZiB0aGUgcGVyc29uIGF0IHRoYXQgZGF0ZS4gT05MWSBPTkUgUkVQT1JUIFBFUiBEQVkgQUxMT1dFRCEhIVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHBlcnNvbjogUGVyc29uLCBsb2c6IE1hcDxEYXRlLCBudW1iZXI+KSB7XG4gICAgICAgIHN1cGVyKHBlcnNvbik7XG4gICAgICAgIHRoaXMubG9nID0gbG9nO1xuICAgICAgICAvKipAdHlwZSB7RGF0ZVtdfSAqL1xuICAgICAgICB0aGlzLmRhdGVzID0gbmV3IEFycmF5KC4uLnRoaXMubG9nLmtleXMoKSk7XG4gICAgICAgIHRoaXMuZGF0ZXMuc29ydCgpO1xuICAgICAgICB0aGlzLm1pbkRhdGUgPSB0aGlzLmRhdGVzWzBdO1xuICAgICAgICB0aGlzLm1heERhdGUgPSB0aGlzLmRhdGVzW3RoaXMuZGF0ZXMubGVuZ3RoIC0gMV07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RGF0ZT99IGRhdGVPZkluZmVjdGlvbiAtIGRhdGUgYXQgd2hpY2ggYW4gaW5mZWN0aW9uIG9jY3VycyBvciBudWxsIHdoZW4gaXQgZG9lcyBub3Qgb2NjdXJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBwcm9iYWJpbGl0eSB0aGF0IHRoaXMgb2JzZXJ2YXRpb24gb2NjdXJzIGdpdmVuIGFuIGludmVjdGlvblxuICAgICAqL1xuICAgIGdldFByb2JhYmlsaXR5KGRhdGVPZkluZmVjdGlvbjogRGF0ZSB8IG51bGwpOiBudW1iZXIge1xuICAgICAgICBsZXQgdmlydXNSZXBvcnRSYXRlID0gMDtcbiAgICAgICAgbGV0IGluZmVjdGlvbk1hdGNoaW5nID0gVmlydXMubm9TeW1wdG9tUHJvYmFiaWxpdHk7IC8vaG93IG11Y2ggdGhlIGluZmVjdGlvbiBtYXRjaGVzIHdpdGggdGhlIHJlcG9ydCBkYXlzXG4gICAgICAgIGlmIChkYXRlT2ZJbmZlY3Rpb24pIHtcbiAgICAgICAgICAgIC8vaW5mZWN0ZWRcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0UmVsZXZhbnREYXkgPSBuZXcgRGF0ZShkYXRlT2ZJbmZlY3Rpb24uZ2V0VGltZSgpICsgVmlydXMuaW5jdWJhdGlvblRpbWUgKiBhbGdvcml0aG1pY0NvbnN0YW50cy5kYXlUb01TKTtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RSZWxldmFudERheSA9IG5ldyBEYXRlKGRhdGVPZkluZmVjdGlvbi5nZXRUaW1lKCkgKyBWaXJ1cy5lbmRPZkluZmVjdGlvc25lc3MgKiBhbGdvcml0aG1pY0NvbnN0YW50cy5kYXlUb01TKTtcbiAgICAgICAgICAgIGNvbnN0IHJlbGV2YW50UmVwb3J0RGF5cyA9IHRoaXMuZGF0ZXMuZmlsdGVyKChkYXRlKSA9PiBmaXJzdFJlbGV2YW50RGF5IDw9IGRhdGUgJiYgZGF0ZSA8PSBsYXN0UmVsZXZhbnREYXkpOy8vcmVwb3J0cyBpbiBpbmZlY3Rpb24gdGltZWZyYW1lXG4gICAgICAgICAgICBmb3IgKGxldCByZWxldmFudFJlcG9ydERheSBvZiByZWxldmFudFJlcG9ydERheXMpIHtcbiAgICAgICAgICAgICAgICBpbmZlY3Rpb25NYXRjaGluZyA9IDEgLSAoMSAtIGluZmVjdGlvbk1hdGNoaW5nKSAqICgxIC0gdGhpcy5sb2cuZ2V0KHJlbGV2YW50UmVwb3J0RGF5KSAvIHJlbGV2YW50UmVwb3J0RGF5cy5sZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5mZWN0aW9uTWF0Y2hpbmcgPSByZWxldmFudFJlcG9ydERheXMubGVuZ3RoIC8gVmlydXMuZW5kT2ZJbmZlY3Rpb3NuZXNzO1xuICAgICAgICB9XG4gICAgICAgIC8vbm90IGluZmVjdGVkXG4gICAgICAgIGxldCBhdmVyYWdlSWxsbmVzcyA9IDA7XG4gICAgICAgIGZvciAobGV0IGRheUxvZyBvZiB0aGlzLmxvZykge1xuICAgICAgICAgICAgYXZlcmFnZUlsbG5lc3MgKz0gZGF5TG9nWzFdO1xuICAgICAgICB9XG4gICAgICAgIGF2ZXJhZ2VJbGxuZXNzIC89IHRoaXMubG9nLnNpemU7XG4gICAgICAgIHJldHVybiB2aXJ1c1JlcG9ydFJhdGUgKiBpbmZlY3Rpb25NYXRjaGluZyArICgxIC0gdmlydXNSZXBvcnRSYXRlKSAqICgwLjkgLSAwLjggKiBhdmVyYWdlSWxsbmVzcyk7IC8vMC45IGlmIG5vIHN5bXB0b21zLCAwLjEgaWYgdG90YWwgc3ltcHRvbXNcbiAgICB9XG59IiwiXG5cbmV4cG9ydCBjbGFzcyBWaXJ1cyB7XG5cblxuICAgIC8qKiBkYXlzIGFmdGVyIGluZmVjdGlvbiB3aGVuIHlvdSBzdGFydCBiZWluZyBpbmZlY3Rpb3VzICovXG4gICAgc3RhdGljIHN0YXJ0T2ZJbmZlY3Rpb3NuZXNzID0gMjtcblxuICAgIC8qKiBkYXlzIGFmdGVyIGluZmVjdGlvbiB3aGVuIHlvdSBzdG9wIGJlaW5nIGluZmVjdGlvdXMgKi9cbiAgICBzdGF0aWMgZW5kT2ZJbmZlY3Rpb3NuZXNzID0gMTA7XG4gICAgLyoqZGF5cyBhZnRlciBmaXJzdCBzeW1wdG9tcyBvY2N1ciAqL1xuICAgIHN0YXRpYyBpbmN1YmF0aW9uVGltZSA9IDUuNTtcbiAgICAvKipwcm9iYWJpbGl0eSBvZiBub3QgaGF2aW5nIGFueSBzeW1wdG9tcyB3aXRoIHRoZSB2aXJ1cyAqL1xuICAgIHN0YXRpYyBub1N5bXB0b21Qcm9iYWJpbGl0eSA9IDAuNTU7XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtQZXJzb25Mb2d9IGxvZyBcbiAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgLSBkYXRlIHRvIGdldCBwcm9iYWJpbGl0eSBmcm9tXG4gICAgICogQHJldHVybnMge251bWJlcn0gLSBwcm9iYWJpbGl0eSBvZiBiZWluZyBpbmZlY3RlZCBhbmQgYWJsZSB0byBzcHJlYWQgdGhlIHZpcnVzIGF0IHRoYXQgZGF0ZVxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRBY3V0ZUluZmVjdGlvblByb2JhYmlsaXR5KGxvZzogeyBnZXRJbmZlY3Rpb25Qcm9iYWJpbGl0eTogKGFyZzA6IERhdGUpID0+IG51bWJlcjsgfSwgZGF0ZTogRGF0ZSkge1xuICAgICAgICBjb25zdCBzdGFydEluZmVjdGlvblBlcmlvZCA9IG5ldyBEYXRlKGRhdGUpOyBzdGFydEluZmVjdGlvblBlcmlvZC5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gVmlydXMuZW5kT2ZJbmZlY3Rpb3NuZXNzKTtcbiAgICAgICAgY29uc3QgZW5kSW5mZWN0aW9uUGVyaW9kID0gbmV3IERhdGUoZGF0ZSk7IGVuZEluZmVjdGlvblBlcmlvZC5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gVmlydXMuc3RhcnRPZkluZmVjdGlvc25lc3MpO1xuICAgICAgICByZXR1cm4gbG9nLmdldEluZmVjdGlvblByb2JhYmlsaXR5KGVuZEluZmVjdGlvblBlcmlvZCkgLSBsb2cuZ2V0SW5mZWN0aW9uUHJvYmFiaWxpdHkoc3RhcnRJbmZlY3Rpb25QZXJpb2QpO1xuICAgIH1cbiAgICBzdGF0aWMgZ2V0UHJvYmFiaWxpdHlPZkluZmVjdGlvdXNuZXNzKGluZmVjdGlvbkRhdGU6ICBEYXRlLCBjdXJyZW50RGF0ZTogRGF0ZSkge1xuICAgICAgICBjb25zdCBzdGFydEluZmVjdGlvblBlcmlvZCA9IG5ldyBEYXRlKGluZmVjdGlvbkRhdGUpOyBzdGFydEluZmVjdGlvblBlcmlvZC5zZXREYXRlKGluZmVjdGlvbkRhdGUuZ2V0RGF0ZSgpICsgVmlydXMuc3RhcnRPZkluZmVjdGlvc25lc3MpO1xuICAgICAgICBjb25zdCBlbmRJbmZlY3Rpb25QZXJpb2QgPSBuZXcgRGF0ZShpbmZlY3Rpb25EYXRlKTsgZW5kSW5mZWN0aW9uUGVyaW9kLnNldERhdGUoaW5mZWN0aW9uRGF0ZS5nZXREYXRlKCkgKyBWaXJ1cy5lbmRPZkluZmVjdGlvc25lc3MpO1xuICAgICAgICByZXR1cm4gKHN0YXJ0SW5mZWN0aW9uUGVyaW9kIDwgY3VycmVudERhdGUgJiYgY3VycmVudERhdGUgPCBlbmRJbmZlY3Rpb25QZXJpb2QpID8gMSA6IDA7XG4gICAgfVxufVxuIiwiZXhwb3J0IGNvbnN0IGFsZ29yaXRobWljQ29uc3RhbnRzID0ge1xuICAgIGRlbHRhVDogMC4xLFxuICAgIGRheVRvTVM6IDEwMDAgKiA2MCAqIDYwICogMjRcbn07IiwiaW1wb3J0IHsgQ29udGFjdCB9IGZyb20gXCIuL0NvbnRhY3RcIjtcbmltcG9ydCB7IFBlcnNvbiB9IGZyb20gXCIuL1BlcnNvblwiO1xuaW1wb3J0IHsgU2ltdWxhdGlvbiB9IGZyb20gXCIuL1NpbXVsYXRpb25cIjtcbmltcG9ydCB7IE9ic2VydmF0aW9uLCBUZXN0IH0gZnJvbSBcIi4vVGVzdFwiO1xuXG5pbnRlcmZhY2UgVGVzdFNlcmlhbGl6YXRpb24ge1xuICAgIHR5cGU6IHN0cmluZztcbiAgICBwZXJzb246IHN0cmluZztcbiAgICBkYXRlOiBEYXRlO1xuICAgIHBvc2l0aXZlOiBib29sZWFuO1xuICAgIHNlbnNpdGl2aXR5OiBudW1iZXI7XG4gICAgc3BlY2lmaWNpdHk6IG51bWJlcjtcbiAgICByZWxldmFudFRpbWVTdGFydDogRGF0ZTtcbiAgICByZWxldmFudFRpbWVFbmQ6IERhdGU7XG59XG5leHBvcnQgY2xhc3MgU2ltdWxhdGlvblNlcmlhbGl6YXRpb24ge1xuICAgIHBlcnNvbnM6IHtcbiAgICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgICB1bnRyYWNrZWRGcmVxdWVuY3k6IG51bWJlcjtcbiAgICAgICAgdW50cmFja2VkSW50ZW5zaXR5OiBudW1iZXI7XG4gICAgICAgIGFjdGl2aXR5U3RyaW5nOiBzdHJpbmc7XG4gICAgfVtdO1xuICAgIGNvbnRhY3RzOiB7XG4gICAgICAgIGE6IHN0cmluZztcbiAgICAgICAgYjogc3RyaW5nO1xuICAgICAgICBkYXRlOiBEYXRlO1xuICAgICAgICBpbnRlbnNpdHk6IG51bWJlcjtcbiAgICB9W107XG4gICAgdGVzdHM6IChUZXN0U2VyaWFsaXphdGlvbiB8IHtcbiAgICAgICAgdHlwZTogc3RyaW5nXG4gICAgfSlbXTtcbiAgICBpbml0aWFsRGF0ZTogRGF0ZTtcbiAgICBsYXN0RGF0ZTogRGF0ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVGVzdChvYnNlcnZhdGlvbjogT2JzZXJ2YXRpb24pOiBvYnNlcnZhdGlvbiBpcyBUZXN0IHtcbiAgICByZXR1cm4gKG9ic2VydmF0aW9uIGFzIFRlc3QpLmRhdGUgIT09IG51bGw7XG59XG5leHBvcnQgZnVuY3Rpb24gaXNTaW11bGF0aW9uU2VyaWFsaXphdGlvbihzZXJpYWxpemF0aW9uOiBhbnkpOiBzZXJpYWxpemF0aW9uIGlzIFNpbXVsYXRpb25TZXJpYWxpemF0aW9uIHtcbiAgICBpZighc2VyaWFsaXphdGlvbi5wZXJzb25zKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgcCA9IChzZXJpYWxpemF0aW9uIGFzIFNpbXVsYXRpb25TZXJpYWxpemF0aW9uKS5wZXJzb25zWzBdO1xuICAgIGlmIChwKSB7XG4gICAgICAgIGlmIChwLmFjdGl2aXR5U3RyaW5nKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVTaW11bGF0aW9uKHNpbXVsYXRpb246IFNpbXVsYXRpb24pOiBTaW11bGF0aW9uU2VyaWFsaXphdGlvbiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcGVyc29uczogc2ltdWxhdGlvbi5wZXJzb25BcnJheS5tYXAoKHBlcnNvbikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuYW1lOiBwZXJzb24ubmFtZSxcbiAgICAgICAgICAgICAgICB1bnRyYWNrZWRGcmVxdWVuY3k6IHBlcnNvbi51bnRyYWNrZWRGcmVxdWVuY3ksXG4gICAgICAgICAgICAgICAgdW50cmFja2VkSW50ZW5zaXR5OiBwZXJzb24udW50cmFja2VkSW50ZW5zaXR5LFxuICAgICAgICAgICAgICAgIGFjdGl2aXR5U3RyaW5nOiBwZXJzb24uZXh0ZXJuYWxBY3Rpdml0eS50b1N0cmluZygpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgICBjb250YWN0czogc2ltdWxhdGlvbi5jb250YWN0cy5tYXAoY29udGFjdCA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGE6IGNvbnRhY3QuYS5uYW1lLFxuICAgICAgICAgICAgICAgIGI6IGNvbnRhY3QuYi5uYW1lLFxuICAgICAgICAgICAgICAgIGRhdGU6IGNvbnRhY3QuZGF0ZSxcbiAgICAgICAgICAgICAgICBpbnRlbnNpdHk6IGNvbnRhY3QuaW50ZW5zaXR5LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSksXG4gICAgICAgIHRlc3RzOiBzaW11bGF0aW9uLm9ic2VydmF0aW9ucy5tYXAoKG9ic2VydmF0aW9uKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNUZXN0KG9ic2VydmF0aW9uKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiVGVzdFwiLFxuICAgICAgICAgICAgICAgICAgICBwZXJzb246IG9ic2VydmF0aW9uLnBlcnNvbi5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBkYXRlOiBvYnNlcnZhdGlvbi5kYXRlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGl2ZTogb2JzZXJ2YXRpb24ucG9zaXRpdmUsXG4gICAgICAgICAgICAgICAgICAgIHNlbnNpdGl2aXR5OiBvYnNlcnZhdGlvbi5zZW5zaXRpdml0eSxcbiAgICAgICAgICAgICAgICAgICAgc3BlY2lmaWNpdHk6IG9ic2VydmF0aW9uLnNwZWNpZmljaXR5LFxuICAgICAgICAgICAgICAgICAgICByZWxldmFudFRpbWVTdGFydDogb2JzZXJ2YXRpb24ucmVsZXZhbnRUaW1lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJlbGV2YW50VGltZUVuZDogb2JzZXJ2YXRpb24ucmVsZXZhbnRUaW1lRW5kXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInVua25vd25cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIGluaXRpYWxEYXRlOiBzaW11bGF0aW9uLmluaXRpYWxEYXRlLFxuICAgICAgICBsYXN0RGF0ZTogc2ltdWxhdGlvbi5sYXN0RGF0ZVxuICAgIH1cbn1cbmZ1bmN0aW9uIGlzVGVzdFNlcmlhbGl6YXRpb24odGVzdDogVGVzdFNlcmlhbGl6YXRpb24gfCB7IHR5cGU6IHN0cmluZyB9KTogdGVzdCBpcyBUZXN0U2VyaWFsaXphdGlvbiB7XG4gICAgcmV0dXJuIHRlc3QudHlwZSA9PSBcIlRlc3RcIjtcbn1cbmV4cG9ydCBmdW5jdGlvbiByZXZpdmUoc2VyaWFsaXphdGlvbjogU2ltdWxhdGlvblNlcmlhbGl6YXRpb24pIHtcbiAgICBjb25zdCBzaW0gPSBuZXcgU2ltdWxhdGlvbihzZXJpYWxpemF0aW9uLmluaXRpYWxEYXRlKTtcbiAgICBzaW0ubGFzdERhdGUgPSBzZXJpYWxpemF0aW9uLmxhc3REYXRlO1xuICAgIGZvciAobGV0IHBlcnNvblNlcmlhbGl6YXRpb24gb2Ygc2VyaWFsaXphdGlvbi5wZXJzb25zKSB7XG4gICAgICAgIHNpbS5hZGRQZXJzb24obmV3IFBlcnNvbihcbiAgICAgICAgICAgIHBlcnNvblNlcmlhbGl6YXRpb24ubmFtZSxcbiAgICAgICAgICAgIHBlcnNvblNlcmlhbGl6YXRpb24udW50cmFja2VkRnJlcXVlbmN5LFxuICAgICAgICAgICAgcGVyc29uU2VyaWFsaXphdGlvbi51bnRyYWNrZWRJbnRlbnNpdHksXG4gICAgICAgICAgICBldmFsKHBlcnNvblNlcmlhbGl6YXRpb24uYWN0aXZpdHlTdHJpbmcpXG4gICAgICAgICkpXG4gICAgfVxuICAgIGNvbnN0IHBlcnNvbkZyb21OYW1lID0gKG5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICBmb3IgKGxldCBwZXJzb24gb2Ygc2ltLnBlcnNvbnMpXG4gICAgICAgICAgICBpZiAocGVyc29uLm5hbWUgPT0gbmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwZXJzb247XG4gICAgICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBmb3IgKGxldCBjIG9mIHNlcmlhbGl6YXRpb24uY29udGFjdHMpIHtcbiAgICAgICAgc2ltLmFkZENvbnRhY3QobmV3IENvbnRhY3QoXG4gICAgICAgICAgICBwZXJzb25Gcm9tTmFtZShjLmEpLFxuICAgICAgICAgICAgcGVyc29uRnJvbU5hbWUoYy5iKSwge1xuICAgICAgICAgICAgZGF0ZTogYy5kYXRlLFxuICAgICAgICAgICAgaW50ZW5zaXR5OiBjLmludGVuc2l0eVxuICAgICAgICB9XG4gICAgICAgICkpXG4gICAgfVxuICAgIGZvciAobGV0IG9iIG9mIHNlcmlhbGl6YXRpb24udGVzdHMpIHtcbiAgICAgICAgaWYgKGlzVGVzdFNlcmlhbGl6YXRpb24ob2IpKSB7XG4gICAgICAgICAgICBjb25zdCB0b0FkZCA9IG5ldyBUZXN0KFxuICAgICAgICAgICAgICAgIHBlcnNvbkZyb21OYW1lKG9iLnBlcnNvbiksXG4gICAgICAgICAgICAgICAgb2IuZGF0ZSxcbiAgICAgICAgICAgICAgICBvYi5wb3NpdGl2ZSxcbiAgICAgICAgICAgICAgICBvYi5zZW5zaXRpdml0eSxcbiAgICAgICAgICAgICAgICBvYi5zcGVjaWZpY2l0eVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRvQWRkLnJlbGV2YW50VGltZVN0YXJ0ID0gb2IucmVsZXZhbnRUaW1lU3RhcnQ7XG4gICAgICAgICAgICB0b0FkZC5yZWxldmFudFRpbWVFbmQgPSBvYi5yZWxldmFudFRpbWVFbmQ7XG4gICAgICAgICAgICBzaW0ub2JzZXJ2YXRpb25zLnB1c2godG9BZGQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNpbS5yZWZyZXNoQ29udGFjdHMoKTtcbiAgICByZXR1cm4gc2ltO1xufVxuXG5jb25zdCBkYXRlS2V5cyA9IG5ldyBTZXQoW1wiZGF0ZVwiLCBcImluaXRpYWxEYXRlXCIsIFwibGFzdERhdGVcIixcInJlbGV2YW50VGltZVN0YXJ0XCIsXCJyZWxldmFudFRpbWVFbmRcIl0pXG5leHBvcnQgZnVuY3Rpb24gdHJ5UGFyc2VTdHJpbmcoanNvblN0cmluZzogc3RyaW5nKSB7XG5cbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGpzb25TdHJpbmcsIChrZXksIHZhbCkgPT4ge1xuICAgICAgICBpZiAoZGF0ZUtleXMuaGFzKGtleSkpXG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUodmFsKTtcbiAgICAgICAgcmV0dXJuIHZhbFxuICAgIH0pO1xuICAgIGlmIChpc1NpbXVsYXRpb25TZXJpYWxpemF0aW9uKHBhcnNlZCkpIHtcbiAgICAgICAgY29uc3Qgc2ltdWxhdGlvbiA9IHJldml2ZShwYXJzZWQpO1xuICAgICAgICByZXR1cm4gc2ltdWxhdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0aWYoX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSkge1xuXHRcdHJldHVybiBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZVxuX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vc3JjL1NpbXVsYXRpb25Xb3JrZXIudHNcIik7XG4vLyBUaGlzIGVudHJ5IG1vZHVsZSB1c2VkICdleHBvcnRzJyBzbyBpdCBjYW4ndCBiZSBpbmxpbmVkXG4iXSwic291cmNlUm9vdCI6IiJ9