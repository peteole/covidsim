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
            this.lastDate = this.contacts[this.contacts.length - 1].date;
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
        this.refreshContacts();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9TaW11bGF0aW9uV29ya2VyLnRzIiwid2VicGFjazovL2Nvdmlkc2ltLy4vc3JjL2xvZ2ljL0NvbnRhY3QudHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvUGVyc29uLnRzIiwid2VicGFjazovL2Nvdmlkc2ltLy4vc3JjL2xvZ2ljL1NpbXVsYXRpb24udHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvVGVzdC50cyIsIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9sb2dpYy9WaXJ1cy50cyIsIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9sb2dpYy9jb25zdGFudHMudHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvc2ltdWxhdGlvblNlcmlhbGl6YXRpb24udHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vY292aWRzaW0vd2VicGFjay9zdGFydHVwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLGdHQUFnRDtBQUNoRCx1SUFBbUY7QUFFbkYsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUM7QUFDcEMsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLENBQUM7QUFDdEMsSUFBSSxpQkFBaUIsR0FBRyxNQUFNLENBQUM7QUFDL0IsSUFBSSxVQUFVLEdBQUcsR0FBRyxDQUFDO0FBQ3JCLElBQUksU0FBUyxHQUdBLElBQUksQ0FBQztBQUdsQixTQUFTLFFBQVEsQ0FBQyxJQUFTO0lBQ3ZCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUNqQixPQUFPLElBQUksQ0FBQztLQUNmO0lBQ0QsT0FBTyxLQUFLLENBQUM7QUFDakIsQ0FBQztBQUNELFNBQVMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFO0lBQ2YsSUFBSSxtREFBeUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDcEMsTUFBTSxV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b3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQZXJzb24gfSBmcm9tIFwiLi9sb2dpYy9QZXJzb25cIjtcbmltcG9ydCB7IFNpbXVsYXRpb24gfSBmcm9tIFwiLi9sb2dpYy9TaW11bGF0aW9uXCI7XG5pbXBvcnQgeyBpc1NpbXVsYXRpb25TZXJpYWxpemF0aW9uLCByZXZpdmUgfSBmcm9tIFwiLi9sb2dpYy9zaW11bGF0aW9uU2VyaWFsaXphdGlvblwiXG5cbmNvbnN0IG1heFNpbXVsYXRpb25SdW5zID0gMTAwMDAwMDAwO1xuY29uc3QgZ3JhcGhpY3NVcGRhdGVJbnRlcnZhbCA9IDEwMDAwMDtcbmxldCBleGFjdG5lc1RocmVzaG9sZCA9IDAuMDAwMTtcbmxldCByZXNvbHV0aW9uID0gMC4xO1xubGV0IGxhc3RBcnJheToge1xuICAgIGRhdGU6IERhdGU7XG4gICAgdmFsdWVzOiBudW1iZXJbXTtcbn1bXSB8IG51bGwgPSBudWxsO1xuXG5cbmZ1bmN0aW9uIGlzQ29uZmlnKGRhdGE6IGFueSk6IGRhdGEgaXMgeyByZXNvbHV0aW9uOiBudW1iZXIgLCBhY2N1cmFjeTpudW1iZXJ9IHtcbiAgICBpZiAoZGF0YS5yZXNvbHV0aW9uKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5vbm1lc3NhZ2UgPSAoZXYpID0+IHtcbiAgICBpZiAoaXNTaW11bGF0aW9uU2VyaWFsaXphdGlvbihldi5kYXRhKSkge1xuICAgICAgICBjb25zdCBzaW11bGF0aW9uID0gcmV2aXZlKGV2LmRhdGEpO1xuICAgICAgICBjb25zdCByZXN1bHRzOiB7XG4gICAgICAgICAgICBwcm9iYWJpbGl0eTogbnVtYmVyO1xuICAgICAgICAgICAgcmVzdWx0OiBNYXA8UGVyc29uLCBEYXRlPjtcbiAgICAgICAgfVtdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbWF4U2ltdWxhdGlvblJ1bnM7IGkrKykge1xuICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHNpbXVsYXRpb24uc2ltdWxhdGVPbmNlKCkpO1xuICAgICAgICAgICAgaWYgKGkgJSBncmFwaGljc1VwZGF0ZUludGVydmFsID09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9jZXNzZWQgPSBzaW11bGF0aW9uLnByb2Nlc3NTaW11bGF0aW9uUmVzdWx0cyhyZXN1bHRzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBhcnJheSA9IFNpbXVsYXRpb24udG9BcnJheShwcm9jZXNzZWQsIHJlc29sdXRpb24sIHNpbXVsYXRpb24ubGFzdERhdGUuZ2V0VGltZSgpKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0ge1xuICAgICAgICAgICAgICAgICAgICBhcnJheTogYXJyYXksXG4gICAgICAgICAgICAgICAgICAgIHBlcnNvbnM6IHNpbXVsYXRpb24ucGVyc29uQXJyYXkubWFwKHBlcnNvbiA9PiBwZXJzb24ubmFtZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgY3R4OiBXb3JrZXIgPSBzZWxmIGFzIGFueTtcbiAgICAgICAgICAgICAgICBjdHgucG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAvL2NoZWNrIGZvciBkaWZmZXJlbmNlIGFuZCBicmVhayBpZiBzbWFsbCBlbm91Z2hcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRpZmZlcmVuY2UgPSAwO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxhc3RBcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YXBvaW50ID0gYXJyYXlbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsYXN0RGF0YXBvaW50ID0gbGFzdEFycmF5W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBkYXRhcG9pbnQudmFsdWVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlmZmVyZW5jZSArPSBNYXRoLmFicyhkYXRhcG9pbnQudmFsdWVzW2pdIC0gbGFzdERhdGFwb2ludC52YWx1ZXNbal0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRpZmZlcmVuY2UgLz0gbGFzdEFycmF5Lmxlbmd0aCAqIGxhc3RBcnJheVswXS52YWx1ZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkaWZmZXJlbmNlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpZmZlcmVuY2UgPCBleGFjdG5lc1RocmVzaG9sZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxhc3RBcnJheSA9IGFycmF5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfWVsc2UgaWYoaXNDb25maWcoZXYuZGF0YSkpe1xuICAgICAgICByZXNvbHV0aW9uPWV2LmRhdGEucmVzb2x1dGlvbjtcbiAgICAgICAgZXhhY3RuZXNUaHJlc2hvbGQ9ZXYuZGF0YS5hY2N1cmFjeTtcbiAgICB9XG59IiwiaW1wb3J0IHtQZXJzb259IGZyb20gXCIuL1BlcnNvblwiO1xuXG4vKipcbiAqIEBjbGFzc1xuICogQHByb3BlcnR5IHtudW1iZXI/fSBpbnRlbnNpdHkgLSBQcm9iYWJpbGl0eSBvZiBpbmZlY3RpbmcgdGhlIG90aGVyIG9uZVxuICogQHByb3BlcnR5IHtEYXRlP30gZGF0ZVxuICovXG5jbGFzcyBDb250YWN0T3B0aW9uc3tcbiAgICBpbnRlbnNpdHk6bnVtYmVyPTAuNTtcbiAgICBkYXRlOkRhdGU9bmV3IERhdGUoKTtcbn1cblxuLyoqXG4gKiBAY2xhc3NcbiAqIEBleHRlbmRzIHtDb250YWN0T3B0aW9uc31cbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRhY3QgZXh0ZW5kcyBDb250YWN0T3B0aW9uc3tcbiAgICBhOiBQZXJzb247XG4gICAgYjogUGVyc29uO1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7UGVyc29ufSBhIFxuICAgICAqIEBwYXJhbSB7UGVyc29ufSBiIFxuICAgICAqIEBwYXJhbSB7Q29udGFjdE9wdGlvbnN9IG9wdGlvbnMgXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYTogUGVyc29uLGI6IFBlcnNvbixvcHRpb25zOiBDb250YWN0T3B0aW9ucyl7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuYT1hO1xuICAgICAgICB0aGlzLmI9YjtcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLG9wdGlvbnMpO1xuICAgIH1cbiAgICBwcm9jZXNzKCl7XG4gICAgICAgIFxuICAgIH1cbn0iLCJpbXBvcnQgeyBhbGdvcml0aG1pY0NvbnN0YW50cyB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xuXG4vKipcbiAqIEB0eXBlZGVmIHsoZGF0ZTpEYXRlKT0+e2NvbnRhY3REZW5zaXR5Om51bWJlcixjb250YWN0SW50ZW5zaXR5Om51bWJlcn19IHVudHJhY2tlZEFjdGl2aXR5XG4gKi9cblxuZXhwb3J0IGludGVyZmFjZSBVbnRyYWNrZWRDb250YWN0ICB7XG4gICAgLyoqLWRhdGUgYXQgd2hpY2ggdGhlIGNvbnRhY3QgdGFrZXMgcGxhY2UgKi9cbiAgICBkYXRlOiBEYXRlO1xuICAgIC8qKnBlcnNvbiBoYXZpbmcgYW4gdW50cmFja2VkIGNvbnRhY3QgKi9cbiAgICBwZXJzb246IFBlcnNvbjtcbiAgICAvKipwcm9iYWJpbGl0eSBvZiB0cmFuc21pc3Npb24gaWYgb25lIG9mIHRoZSBwZXJzb25zIGlzIGluZmVjdGVkIGFuZCB0aGUgb3RoZXIgb25lIG5vdCAqL1xuICAgIGludGVuc2l0eTogbnVtYmVyO1xuICAgIC8qKndoZXRoZXIgb3RoZXIgcGVyc29uIGlzIGluZmVjdGVkIGFjdXRlbHkgKi9cbiAgICBhY3V0ZUluZmVjdGVkOiBib29sZWFuO1xuICAgIC8qKndoZXRoZXIgdGhlIG90aGVyIHBlcnNvbiB3YXMgaW5mZWN0ZWQgYXQgYW55IHBvaW50IGluIHRpbWUgKi9cbiAgICBldmVySW5mZWN0ZWQ6IGJvb2xlYW47XG59XG4vKiogZ2VuZXJhdGVzIG5leHQgdW50cmFja2VkIGNvbnRhY3Qgc3RhcnRpbmcgYXQgYSBnaXZlbiBkYXRlICovXG5leHBvcnQgdHlwZSB1bnRyYWNrZWRDb250YWN0R2VuZXJhdG9yPShkYXRlOkRhdGUscGVyc29uOlBlcnNvbik9PlVudHJhY2tlZENvbnRhY3Q7XG5cbmNvbnN0IGRlZmF1bHRDb250YWN0R2VuZXJhdG9yOnVudHJhY2tlZENvbnRhY3RHZW5lcmF0b3IgPSAoZGF0ZTogRGF0ZSwgcGVyc29uOiBQZXJzb24pID0+ICh7XG4gICAgZGF0ZTogbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkgKyAyICogcGVyc29uLnVudHJhY2tlZEZyZXF1ZW5jeSAqIE1hdGgucmFuZG9tKCkgKiAxMDAwKjYwKjYwKjI0KSxcbiAgICBhY3V0ZUluZmVjdGVkOiAwLjAwMSA+IE1hdGgucmFuZG9tKCksXG4gICAgZXZlckluZmVjdGVkOiAwLjAxID4gTWF0aC5yYW5kb20oKSxcbiAgICBpbnRlbnNpdHk6IDIgKiBNYXRoLnJhbmRvbSgpICogcGVyc29uLnVudHJhY2tlZEludGVuc2l0eSxcbiAgICBwZXJzb246IHBlcnNvblxufSk7XG4vKipcbiAqIENsYXNzIHJlcHJlc2VudGluZyBwZXJzb25zIGluIHRoZSByZWFsIHdvcmxkLlxuICovXG5leHBvcnQgY2xhc3MgUGVyc29uIHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgdW50cmFja2VkRnJlcXVlbmN5OiBudW1iZXI7XG4gICAgdW50cmFja2VkSW50ZW5zaXR5OiBudW1iZXI7XG4gICAgZXh0ZXJuYWxBY3Rpdml0eTogdW50cmFja2VkQ29udGFjdEdlbmVyYXRvcjtcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgICAqIEBwYXJhbSB7dW50cmFja2VkQ29udGFjdEdlbmVyYXRvcn0gZXh0ZXJuYWxBY3Rpdml0eSAtIGdlbmVyYXRlcyBuZXh0IGNvbnRhY3Qgb2YgcGVyc29uIHN0YXJ0aW5nIGF0IGdpdmVuIGRhdGVcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIHVudHJhY2tlZEZyZXF1ZW5jeSA9IDEsIHVudHJhY2tlZEludGVuc2l0eSA9IDAuMSwgZXh0ZXJuYWxBY3Rpdml0eTp1bnRyYWNrZWRDb250YWN0R2VuZXJhdG9yID0gZGVmYXVsdENvbnRhY3RHZW5lcmF0b3IpIHtcbiAgICAgICAgdGhpcy5leHRlcm5hbEFjdGl2aXR5ID0gZXh0ZXJuYWxBY3Rpdml0eTtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy51bnRyYWNrZWRGcmVxdWVuY3kgPSB1bnRyYWNrZWRGcmVxdWVuY3k7XG4gICAgICAgIHRoaXMudW50cmFja2VkSW50ZW5zaXR5ID0gdW50cmFja2VkSW50ZW5zaXR5O1xuICAgIH1cbn0iLCJpbXBvcnQgeyBQZXJzb24sIFVudHJhY2tlZENvbnRhY3QgfSBmcm9tIFwiLi9QZXJzb25cIjtcbmltcG9ydCB7IENvbnRhY3QgfSBmcm9tIFwiLi9Db250YWN0XCI7XG5pbXBvcnQgeyBWaXJ1cyB9IGZyb20gXCIuL1ZpcnVzXCI7XG5pbXBvcnQgeyBPYnNlcnZhdGlvbiwgVGVzdCB9IGZyb20gXCIuL1Rlc3RcIjtcbmltcG9ydCB7IGFsZ29yaXRobWljQ29uc3RhbnRzIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1VudHJhY2tlZChjb250YWN0OiBVbnRyYWNrZWRDb250YWN0IHwgQ29udGFjdCk6IGNvbnRhY3QgaXMgVW50cmFja2VkQ29udGFjdCB7XG4gICAgcmV0dXJuIChjb250YWN0IGFzIFVudHJhY2tlZENvbnRhY3QpLnBlcnNvbiAhPSBudWxsO1xufVxuLyoqXG4gKiBTaW11bGF0aW9uIG9mIGFuIGluZmVjdGlvbi4gUHJvdmlkZXMgdGhlIGZ1bmN0aW9uYWxpdHkgdG8gc2ltdWxhdGUgdGhlIHBsb3QgbWFueSB0aW1lcyB0byBhcHByb3hpbWF0ZSBwcm9iYWJpbGl0aWVzIGF0IGdpdmVuIHRlc3QgcmVzdWx0c1xuICovXG5leHBvcnQgY2xhc3MgU2ltdWxhdGlvbiB7XG4gICAgb2JzZXJ2YXRpb25zOiBPYnNlcnZhdGlvbltdO1xuICAgIGluaXRpYWxEYXRlOiBEYXRlO1xuICAgIGxhc3REYXRlOiBEYXRlO1xuICAgIHBlcnNvbnM6IFNldDxQZXJzb24+O1xuICAgIGNvbnRhY3RzOiBDb250YWN0W107XG4gICAgcGVyc29uVG9Jbml0aWFsSW5mZWN0aW9uRGF0ZTogTWFwPFBlcnNvbiwgKCkgPT4gRGF0ZT47XG4gICAgY29uc3RydWN0b3IoaW5pdGlhbERhdGU6IERhdGUgPSBuZXcgRGF0ZSgpLCBvYnNlcnZhdGlvbnM6IE9ic2VydmF0aW9uW10gPSBbXSkge1xuICAgICAgICB0aGlzLm9ic2VydmF0aW9ucyA9IG9ic2VydmF0aW9ucztcbiAgICAgICAgdGhpcy5pbml0aWFsRGF0ZSA9IGluaXRpYWxEYXRlO1xuICAgICAgICB0aGlzLmxhc3REYXRlID0gaW5pdGlhbERhdGU7XG4gICAgICAgIC8qKkB0eXBlIHtTZXQ8UGVyc29uPn0qL1xuICAgICAgICB0aGlzLnBlcnNvbnMgPSBuZXcgU2V0KCk7XG4gICAgICAgIC8qKiBAdHlwZSB7Q29udGFjdFtdfSAqL1xuICAgICAgICB0aGlzLmNvbnRhY3RzID0gW107XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBc3NpZ25zIGEgZnVuY3Rpb24gdG8gZWFjaCBwZXJzb24gd2hpY2ggZ2VuZXJhdGVzIGFuIGluaXRpYWwgaW5mZWN0aW9uIGRhdGUgKG9yIG51bGwgaWYgbm8gaW5mZWN0aW9uIGhhcHBlbmVkKVxuICAgICAgICAgKiBAdHlwZSB7TWFwPFBlcnNvbiwoKT0+RGF0ZT99XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnBlcnNvblRvSW5pdGlhbEluZmVjdGlvbkRhdGUgPSBuZXcgTWFwKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7UGVyc29ufSBwZXJzb24gXG4gICAgICogQHBhcmFtIHsoKT0+RGF0ZT99IGRhdGVHZW5lcmF0b3IgLWZ1bmN0aW9uIHdoaWNoIGdlbmVyYXRlcyBhbiBpbml0aWFsIGluZmVjdGlvbiBkYXRlIChvciBudWxsIGlmIG5vIGluZmVjdGlvbiBoYXBwZW5lZClcbiAgICAgKi9cbiAgICBzZXRJbmZlY3Rpb25EYXRlRnVuY3Rpb24ocGVyc29uOiBQZXJzb24sIGRhdGVHZW5lcmF0b3I6ICgpID0+IERhdGUgfCBudWxsKSB7XG4gICAgICAgIHRoaXMucGVyc29uVG9Jbml0aWFsSW5mZWN0aW9uRGF0ZS5zZXQocGVyc29uLCBkYXRlR2VuZXJhdG9yKTtcbiAgICB9XG4gICAgLyoqQHBhcmFtIHtQZXJzb259IHRvQWRkICovXG4gICAgYWRkUGVyc29uKHRvQWRkOiBQZXJzb24pIHtcbiAgICAgICAgdGhpcy5wZXJzb25zLmFkZCh0b0FkZCk7XG5cbiAgICAgICAgdGhpcy5wZXJzb25Ub0luaXRpYWxJbmZlY3Rpb25EYXRlLnNldCh0b0FkZCwgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKHRoaXMuaW5pdGlhbERhdGUuZ2V0VGltZSgpIC0gTWF0aC5yYW5kb20oKSAqIDEwMCAqIGFsZ29yaXRobWljQ29uc3RhbnRzLmRheVRvTVMpOy8vcmFuZG9tIGRheSBpbiB0aGUgbGFzdCAxMDAgZGF5c1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKiogQHBhcmFtIHtDb250YWN0fSB0b0FkZCAtIGNvbnRhY3QgdG8gYmUgYWRkZWQgdG8gdGhlIHByb2Nlc3Npb24gbGlzdCAqL1xuICAgIGFkZENvbnRhY3QodG9BZGQ6IENvbnRhY3QpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmNvbnRhY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodG9BZGQuZGF0ZS5nZXRUaW1lKCkgPCB0aGlzLmNvbnRhY3RzW2ldLmRhdGUuZ2V0VGltZSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb250YWN0cy5zcGxpY2UoaSwgMCwgdG9BZGQpO1xuICAgICAgICAgICAgICAgIHRoaXMucGVyc29ucy5hZGQodG9BZGQuYSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wZXJzb25zLmFkZCh0b0FkZC5iKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb250YWN0cy5wdXNoKHRvQWRkKTtcbiAgICAgICAgdGhpcy5hZGRQZXJzb24odG9BZGQuYSk7XG4gICAgICAgIHRoaXMuYWRkUGVyc29uKHRvQWRkLmIpO1xuICAgICAgICBpZiAodGhpcy5sYXN0RGF0ZSA8IHRvQWRkLmRhdGUpXG4gICAgICAgICAgICB0aGlzLmxhc3REYXRlID0gdG9BZGQuZGF0ZTtcbiAgICB9XG4gICAgLyoqb3JkZXIgY29udGFjdHMgdG8gYXZvaWQgYW55IGVycm9ycyAqL1xuICAgIHJlZnJlc2hDb250YWN0cygpIHtcbiAgICAgICAgdGhpcy5jb250YWN0cy5zb3J0KChhLCBiKSA9PiBhLmRhdGUuZ2V0VGltZSgpIC0gYi5kYXRlLmdldFRpbWUoKSk7XG4gICAgICAgIGlmICh0aGlzLmNvbnRhY3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMubGFzdERhdGUgPSB0aGlzLmNvbnRhY3RzW3RoaXMuY29udGFjdHMubGVuZ3RoIC0gMV0uZGF0ZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBvIG9mIHRoaXMub2JzZXJ2YXRpb25zKSB7XG4gICAgICAgICAgICBpZiAobyBpbnN0YW5jZW9mIFRlc3QgJiYgby5kYXRlICYmIG8uZGF0ZSA+IHRoaXMubGFzdERhdGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxhc3REYXRlID0gby5kYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmNvbnRhY3RzLmxlbmd0aCA+IDAgJiYgdGhpcy5pbml0aWFsRGF0ZSA+IHRoaXMuY29udGFjdHNbMF0uZGF0ZSkge1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsRGF0ZSA9IHRoaXMuY29udGFjdHNbMF0uZGF0ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzaW11bGF0ZU9uY2UoKSB7XG4gICAgICAgIHRoaXMucmVmcmVzaENvbnRhY3RzKCk7XG4gICAgICAgIGNvbnN0IGxhc3REYXRlVG9TaW11bGF0ZSA9IHRoaXMubGFzdERhdGU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAdHlwZSB7TWFwPFBlcnNvbixEYXRlPn1cbiAgICAgICAgICovXG4gICAgICAgIGNvbnN0IHJlc3VsdDogTWFwPFBlcnNvbiwgRGF0ZT4gPSBuZXcgTWFwKCk7XG4gICAgICAgIC8qKkB0eXBlIHtVbnRyYWNrZWRDb250YWN0fENvbnRhY3QpW119ICovXG4gICAgICAgIGNvbnN0IGV2ZW50czogKFVudHJhY2tlZENvbnRhY3QgfCBDb250YWN0KVtdID0gbmV3IEFycmF5KC4uLnRoaXMuY29udGFjdHMpO1xuICAgICAgICAvKipAdHlwZSB7KGNvbnRhY3Q6aW1wb3J0KFwiLi9QZXJzb24uanNcIikuVW50cmFja2VkQ29udGFjdCk9PnZvaWR9ICovXG4gICAgICAgIGNvbnN0IGFkZFVudHJhY2tlZENvbnRhY3Q6IChjb250YWN0OiBVbnRyYWNrZWRDb250YWN0KSA9PiB2b2lkID0gKGNvbnN0YWN0KTogdm9pZCA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRlID0gY29uc3RhY3QuZGF0ZTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgaW4gZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50c1tpXS5kYXRlID4gZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBldmVudHMuc3BsaWNlKE51bWJlci5wYXJzZUludChpKSwgMCwgY29uc3RhY3QpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXZlbnRzLnB1c2goY29uc3RhY3QpO1xuICAgICAgICB9O1xuICAgICAgICBmb3IgKGxldCBwZXJzb24gb2YgdGhpcy5wZXJzb25zKSB7XG4gICAgICAgICAgICBjb25zdCBpbml0aWFsRGF0ZSA9IHRoaXMucGVyc29uVG9Jbml0aWFsSW5mZWN0aW9uRGF0ZS5nZXQocGVyc29uKSgpO1xuICAgICAgICAgICAgcmVzdWx0LnNldChwZXJzb24sIGluaXRpYWxEYXRlKTtcbiAgICAgICAgICAgIGZvciAobGV0IGNvbnRhY3QgPSBwZXJzb24uZXh0ZXJuYWxBY3Rpdml0eSh0aGlzLmluaXRpYWxEYXRlLCBwZXJzb24pOyBjb250YWN0LmRhdGUgPCBsYXN0RGF0ZVRvU2ltdWxhdGU7IGNvbnRhY3QgPSBwZXJzb24uZXh0ZXJuYWxBY3Rpdml0eShjb250YWN0LmRhdGUsIHBlcnNvbikpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29udGFjdC5hY3V0ZUluZmVjdGVkKVxuICAgICAgICAgICAgICAgICAgICBhZGRVbnRyYWNrZWRDb250YWN0KGNvbnRhY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGNvbnRhY3Qgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICBpZiAoaXNVbnRyYWNrZWQoY29udGFjdCkpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnRhY3QgaXMgdW50cmFja2VkLiBUaGlzIGlzIG9ubHkgdHJpZ2dlcmVkIGlmIHRoZSBvdGhlciBwZXJzb24gaXMgaW5mZWN0ZWRcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5nZXQoY29udGFjdC5wZXJzb24pICYmIE1hdGgucmFuZG9tKCkgPCBjb250YWN0LmludGVuc2l0eSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0KGNvbnRhY3QucGVyc29uLCBjb250YWN0LmRhdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vY29udGFjdCBpcyB0cmFja2VkXG4gICAgICAgICAgICBjb25zdCBhRGF0ZSA9IHJlc3VsdC5nZXQoY29udGFjdC5hKTtcbiAgICAgICAgICAgIGNvbnN0IGJEYXRlID0gcmVzdWx0LmdldChjb250YWN0LmIpO1xuICAgICAgICAgICAgLy8gaWYgYm90aCBvciBub25lIGlzIGluZmVjdGVkIG5vdGhpbmcgaGFwcGVuc1xuICAgICAgICAgICAgaWYgKGFEYXRlICYmIGJEYXRlIHx8ICFhRGF0ZSAmJiAhYkRhdGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBpZiAoYURhdGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9iYWJpbGl0eU9mSW5mZWN0aW9uID0gY29udGFjdC5pbnRlbnNpdHkgKiBWaXJ1cy5nZXRQcm9iYWJpbGl0eU9mSW5mZWN0aW91c25lc3MoYURhdGUsIGNvbnRhY3QuZGF0ZSk7XG4gICAgICAgICAgICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPCBwcm9iYWJpbGl0eU9mSW5mZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXQoY29udGFjdC5iLCBjb250YWN0LmRhdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChiRGF0ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2JhYmlsaXR5T2ZJbmZlY3Rpb24gPSBjb250YWN0LmludGVuc2l0eSAqIFZpcnVzLmdldFByb2JhYmlsaXR5T2ZJbmZlY3Rpb3VzbmVzcyhiRGF0ZSwgY29udGFjdC5kYXRlKTtcbiAgICAgICAgICAgICAgICBpZiAocHJvYmFiaWxpdHlPZkluZmVjdGlvbiA8PSAwKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IHByb2JhYmlsaXR5T2ZJbmZlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldChjb250YWN0LmEsIGNvbnRhY3QuZGF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxldCBwcm9iYWJpbGl0eSA9IDE7XG4gICAgICAgIGZvciAobGV0IG9ic2VydmF0aW9uIG9mIHRoaXMub2JzZXJ2YXRpb25zKSB7XG4gICAgICAgICAgICBwcm9iYWJpbGl0eSAqPSBvYnNlcnZhdGlvbi5nZXRQcm9iYWJpbGl0eShyZXN1bHQuZ2V0KG9ic2VydmF0aW9uLnBlcnNvbikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwcm9iYWJpbGl0eTogcHJvYmFiaWxpdHksXG4gICAgICAgICAgICByZXN1bHQ6IHJlc3VsdFxuICAgICAgICB9O1xuICAgIH1cbiAgICBwcm9jZXNzU2ltdWxhdGlvblJlc3VsdHMocmVzdWx0czogeyByZXN1bHQ6IE1hcDxQZXJzb24sIERhdGU+OyBwcm9iYWJpbGl0eTogbnVtYmVyOyB9W10pIHtcblxuICAgICAgICBsZXQgcHJvYmFiaWxpdHlTdW0gPSAwO1xuICAgICAgICBmb3IgKGxldCByZXN1bHQgb2YgcmVzdWx0cylcbiAgICAgICAgICAgIHByb2JhYmlsaXR5U3VtICs9IHJlc3VsdC5wcm9iYWJpbGl0eTtcbiAgICAgICAgLyoqQHR5cGUge01hcDxQZXJzb24sbnVtYmVyPn0gKi9cbiAgICAgICAgY29uc3QgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eTogTWFwPFBlcnNvbiwgbnVtYmVyPiA9IG5ldyBNYXAoKTtcbiAgICAgICAgZm9yIChsZXQgcGVyc29uIG9mIHRoaXMucGVyc29ucykge1xuICAgICAgICAgICAgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eS5zZXQocGVyc29uLCAwKTtcbiAgICAgICAgfVxuICAgICAgICAvKipAdHlwZSB7TWFwPFBlcnNvbix7ZGF0ZTpEYXRlLHA6bnVtYmVyLCBwQWNjOm51bWJlcj99W10+fSAqL1xuICAgICAgICBjb25zdCBpbmZlY3Rpb25EYXRlczogTWFwPFBlcnNvbiwgeyBkYXRlOiBEYXRlOyBwOiBudW1iZXI7IHBBY2M6IG51bWJlciB8IG51bGw7IH1bXT4gPSBuZXcgTWFwKCk7XG4gICAgICAgIGZvciAobGV0IHBlcnNvbiBvZiB0aGlzLnBlcnNvbnMpXG4gICAgICAgICAgICBpbmZlY3Rpb25EYXRlcy5zZXQocGVyc29uLCBbXSk7XG4gICAgICAgIGZvciAobGV0IHJlc3VsdCBvZiByZXN1bHRzKSB7XG4gICAgICAgICAgICBjb25zdCByZWFsUHJvYiA9IHJlc3VsdC5wcm9iYWJpbGl0eSAvIHByb2JhYmlsaXR5U3VtO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBwZXJzb24gb2YgdGhpcy5wZXJzb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5yZXN1bHQuZ2V0KHBlcnNvbikpXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsSW5mZWN0aW9uUHJvYmFiaWxpdHkuc2V0KHBlcnNvbiwgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eS5nZXQocGVyc29uKSArIHJlYWxQcm9iKTtcbiAgICAgICAgICAgICAgICBpbmZlY3Rpb25EYXRlcy5nZXQocGVyc29uKS5wdXNoKHsgZGF0ZTogcmVzdWx0LnJlc3VsdC5nZXQocGVyc29uKSwgcDogcmVhbFByb2IsIHBBY2M6IG51bGwgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgcGVyc29uIG9mIHRoaXMucGVyc29ucykge1xuICAgICAgICAgICAgY29uc3QgaW5mZWN0aW9uRGF0ZXNQZXJzb24gPSBpbmZlY3Rpb25EYXRlcy5nZXQocGVyc29uKTtcbiAgICAgICAgICAgIGluZmVjdGlvbkRhdGVzUGVyc29uLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWEuZGF0ZSAmJiAhYi5kYXRlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgICBpZiAoIWEuZGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgaWYgKCFiLmRhdGUpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5kYXRlLmdldFRpbWUoKSAtIGIuZGF0ZS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGxldCBhY2N1bXVsYXRlZFByb2IgPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgZGF0ZSBvZiBpbmZlY3Rpb25EYXRlc1BlcnNvbikge1xuICAgICAgICAgICAgICAgIGFjY3VtdWxhdGVkUHJvYiArPSBkYXRlLnA7XG4gICAgICAgICAgICAgICAgZGF0ZS5wQWNjID0gYWNjdW11bGF0ZWRQcm9iO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGluaXRpYWxEYXRlOiB0aGlzLmluaXRpYWxEYXRlLFxuICAgICAgICAgICAgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eTogdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eSxcbiAgICAgICAgICAgIGluZmVjdGlvblRpbWVsaW5lOiBpbmZlY3Rpb25EYXRlc1xuICAgICAgICB9O1xuICAgIH1cbiAgICBzaW11bGF0ZShydW5zOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0czogeyByZXN1bHQ6IE1hcDxQZXJzb24sIERhdGU+OyBwcm9iYWJpbGl0eTogbnVtYmVyOyB9W10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBydW5zOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuc2ltdWxhdGVPbmNlKCk7XG4gICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzU2ltdWxhdGlvblJlc3VsdHMocmVzdWx0cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY29tcHV0ZXMgYW4gYXJyYXkgcmVwcmVzZW50YXRpb24gb2YgdGhlIHNpbXVsYXRpb24gcmVzdWx0c1xuICAgICAqIEBwYXJhbSByZXN1bHQgLXNpbXVsYXRpb24gcmVzdWx0IG9iamVjdFxuICAgICAqIEBwYXJhbSByZXNvbHV0aW9uIC0gbnVtYmVyIG9mIGRhdGFwb2ludHMgdG8gc2hvdyBwZXIgZGF5XG4gICAgICogQHBhcmFtIGxhc3REYXRlIC0gbGFzdCBkYXRlIHRvIHNpbXVsYXRlIGluIG1zIGZyb20gMTk3MFxuICAgICAqL1xuICAgIHN0YXRpYyB0b0FycmF5KHJlc3VsdDoge1xuICAgICAgICBpbml0aWFsRGF0ZTogRGF0ZTtcbiAgICAgICAgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eTogTWFwPFBlcnNvbiwgbnVtYmVyPjtcbiAgICAgICAgaW5mZWN0aW9uVGltZWxpbmU6IE1hcDxQZXJzb24sIHtcbiAgICAgICAgICAgIGRhdGU6IERhdGU7XG4gICAgICAgICAgICBwOiBudW1iZXI7XG4gICAgICAgICAgICBwQWNjOiBudW1iZXI7XG4gICAgICAgIH1bXT47XG4gICAgfSwgcmVzb2x1dGlvbjogbnVtYmVyLCBsYXN0RGF0ZTogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHBlcnNvbkFycmF5ID0gbmV3IEFycmF5KC4uLnJlc3VsdC5pbmZlY3Rpb25UaW1lbGluZS5rZXlzKCkpO1xuICAgICAgICBjb25zdCBsaXN0OiB7IGRhdGU6IERhdGUsIHZhbHVlczogbnVtYmVyW10gfVtdID0gW11cbiAgICAgICAgY29uc3QgaW5kaWNlcyA9IHBlcnNvbkFycmF5Lm1hcCgocGVyc29uKSA9PiAwKTtcbiAgICAgICAgZm9yIChsZXQgZGF0ZSA9IHJlc3VsdC5pbml0aWFsRGF0ZTsgZGF0ZS5nZXRUaW1lKCkgPCBsYXN0RGF0ZTsgZGF0ZSA9IG5ldyBEYXRlKGRhdGUuZ2V0VGltZSgpICsgcmVzb2x1dGlvbiAqIDEwMDAgKiA2MCAqIDYwICogMjQpKSB7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZXMgPSBuZXcgQXJyYXkocGVyc29uQXJyYXkubGVuZ3RoKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGVyc29uQXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwZXJzb24gPSBwZXJzb25BcnJheVtpXTtcbiAgICAgICAgICAgICAgICBjb25zdCBwZXJzb25WYWx1ZXMgPSByZXN1bHQuaW5mZWN0aW9uVGltZWxpbmUuZ2V0KHBlcnNvbik7XG4gICAgICAgICAgICAgICAgbGV0IGluZGV4ID0gaW5kaWNlc1tpXTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaW5kZXggKyAxIDwgcGVyc29uVmFsdWVzLmxlbmd0aCAmJiBwZXJzb25WYWx1ZXNbaW5kZXggKyAxXS5kYXRlICYmIHBlcnNvblZhbHVlc1tpbmRleCArIDFdLmRhdGUgPCBkYXRlKVxuICAgICAgICAgICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgICAgIGluZGljZXNbaV0gPSBpbmRleDtcbiAgICAgICAgICAgICAgICBuZXdWYWx1ZXNbaV0gPSBwZXJzb25WYWx1ZXNbaW5kZXhdLnBBY2M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsaXN0LnB1c2goeyBkYXRlOiBkYXRlLCB2YWx1ZXM6IG5ld1ZhbHVlcyB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG5cblxuXG4gICAgLyoqcmV0dXJucyB0aGUgcGVyc29ucyBhcyBhcnJheSB0byBiZSBhYmxlIHRvIHVzZSBBcnJheS5tYXAgZXRjICovXG4gICAgZ2V0IHBlcnNvbkFycmF5KCkge1xuICAgICAgICByZXR1cm4gbmV3IEFycmF5KC4uLnRoaXMucGVyc29ucyk7XG4gICAgfVxufSIsImltcG9ydCB7IFZpcnVzIH0gZnJvbSBcIi4vVmlydXNcIjtcbmltcG9ydCB7IFBlcnNvbiB9IGZyb20gXCIuL1BlcnNvblwiO1xuaW1wb3J0IHsgYWxnb3JpdGhtaWNDb25zdGFudHMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuZXhwb3J0IGNsYXNzIE9ic2VydmF0aW9uIHtcbiAgICBwZXJzb246IFBlcnNvbjtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge1BlcnNvbn0gcGVyc29uIFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHBlcnNvbjogUGVyc29uKSB7XG4gICAgICAgIHRoaXMucGVyc29uID0gcGVyc29uO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0RhdGU/fSBkYXRlT2ZJbmZlY3Rpb24gLSBkYXRlIGF0IHdoaWNoIGFuIGluZmVjdGlvbiBvY2N1cnMgb3IgbnVsbCB3aGVuIGl0IGRvZXMgbm90IG9jY3VyXG4gICAgICogQHJldHVybnMge251bWJlcn0gcHJvYmFiaWxpdHkgdGhhdCB0aGlzIG9ic2VydmF0aW9uIG9jY3VycyBnaXZlbiBhbiBpbnZlY3Rpb25cbiAgICAgKi9cbiAgICBnZXRQcm9iYWJpbGl0eShkYXRlT2ZJbmZlY3Rpb246IERhdGUgfCBudWxsKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbn1cbi8qKlxuICogQHR5cGVkZWYge09iamVjdH0gVGVzdE9wdGlvbnNcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzZW5zaXRpdml0eVxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNwZWNpZmljaXR5XG4gKiBAcHJvcGVydHkge251bWJlcn0gdGltZVRcbiAqL1xuXG4vKipcbiAqIEBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgVGVzdCBleHRlbmRzIE9ic2VydmF0aW9uIHtcbiAgICBzdGFydE9ic2VydmFiaWxpdHk6IG51bWJlcjtcbiAgICBlbmRPYnNlcnZhYmlsaXR5OiBudW1iZXI7XG4gICAgcG9zaXRpdmU6IGJvb2xlYW47XG4gICAgc2Vuc2l0aXZpdHk6IG51bWJlcjtcbiAgICBzcGVjaWZpY2l0eTogbnVtYmVyO1xuICAgIGRhdGU6IERhdGU7XG4gICAgcmVsZXZhbnRUaW1lU3RhcnQ6IERhdGU7XG4gICAgcmVsZXZhbnRUaW1lRW5kOiBEYXRlO1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7UGVyc29ufSBwZXJzb25cbiAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgLSBkYXRlIG9mIHRoZSB0ZXN0XG4gICAgICogQHBhcmFtIHtib29sZWFufSBwb3NpdGl2ZSAtIHRydWUgaWYgdGhlIHJlc3VsdCBpcyBwb3NpdGl2ZVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHBlcnNvbjogUGVyc29uLCBkYXRlOiBEYXRlLCBwb3NpdGl2ZTogYm9vbGVhbiwgc2Vuc2l0aXZpdHkgPSAwLjk1LCBzcGVjaWZpY2l0eSA9IDAuOSwgc3RhcnRPYnNlcnZhYmlsaXR5ID0gMiwgZW5kT2JzZXJ2YWJpbGl0eSA9IDE0KSB7XG4gICAgICAgIHN1cGVyKHBlcnNvbik7XG4gICAgICAgIHRoaXMuc2V0RGF0ZShkYXRlKTtcbiAgICAgICAgdGhpcy5zdGFydE9ic2VydmFiaWxpdHkgPSBzdGFydE9ic2VydmFiaWxpdHk7XG4gICAgICAgIHRoaXMuZW5kT2JzZXJ2YWJpbGl0eSA9IGVuZE9ic2VydmFiaWxpdHk7XG4gICAgICAgIHRoaXMucG9zaXRpdmUgPSBwb3NpdGl2ZTtcbiAgICAgICAgdGhpcy5zZW5zaXRpdml0eSA9IHNlbnNpdGl2aXR5O1xuICAgICAgICB0aGlzLnNwZWNpZmljaXR5ID0gc3BlY2lmaWNpdHk7XG4gICAgfVxuICAgIHNldERhdGUoZGF0ZSA9IHRoaXMuZGF0ZSkge1xuICAgICAgICB0aGlzLmRhdGUgPSBkYXRlO1xuICAgICAgICB0aGlzLnJlbGV2YW50VGltZVN0YXJ0ID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgIHRoaXMucmVsZXZhbnRUaW1lU3RhcnQuc2V0RGF0ZShkYXRlLmdldERhdGUoKSAtIHRoaXMuZW5kT2JzZXJ2YWJpbGl0eSk7XG4gICAgICAgIHRoaXMucmVsZXZhbnRUaW1lRW5kID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgIHRoaXMucmVsZXZhbnRUaW1lRW5kLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgLSB0aGlzLnN0YXJ0T2JzZXJ2YWJpbGl0eSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RGF0ZT99IGRhdGVPZkluZmVjdGlvbiAtIGRhdGUgYXQgd2hpY2ggYW4gaW5mZWN0aW9uIG9jY3VycyBvciBudWxsIHdoZW4gaXQgZG9lcyBub3Qgb2NjdXJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBwcm9iYWJpbGl0eSB0aGF0IHRoaXMgb2JzZXJ2YXRpb24gb2NjdXJzIGdpdmVuIGFuIGludmVjdGlvblxuICAgICAqL1xuICAgIGdldFByb2JhYmlsaXR5KGRhdGVPZkluZmVjdGlvbjogRGF0ZSB8IG51bGwpOiBudW1iZXIge1xuICAgICAgICBpZiAoZGF0ZU9mSW5mZWN0aW9uICYmIGRhdGVPZkluZmVjdGlvbiA+IHRoaXMucmVsZXZhbnRUaW1lU3RhcnQgJiYgZGF0ZU9mSW5mZWN0aW9uIDwgdGhpcy5yZWxldmFudFRpbWVFbmQpIHtcbiAgICAgICAgICAgIC8vaW5mZWN0ZWRcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBvc2l0aXZlID8gdGhpcy5zZW5zaXRpdml0eSA6IDEgLSB0aGlzLnNwZWNpZmljaXR5O1xuICAgICAgICB9XG4gICAgICAgIC8vbm90IGluZmVjdGVkXG4gICAgICAgIHJldHVybiB0aGlzLnBvc2l0aXZlID8gKDEgLSB0aGlzLnNwZWNpZmljaXR5KSA6IHRoaXMuc2Vuc2l0aXZpdHk7XG4gICAgfVxufVxuLyoqXG4gKiBBIGxvZyBvZiB0aGUgc3ltcHRvbXMgYSBwZXJzb24gaGFzLiBOb3RlIHRoYXQgYSBsb2cgTVVTVCBjb250YWluIEFMTCBsb2dzIGFib3V0IG9uZSBwZXJzb24hXG4gKi9cbmV4cG9ydCBjbGFzcyBTeW1wdG9tTG9nIGV4dGVuZHMgT2JzZXJ2YXRpb24ge1xuICAgIGxvZzogTWFwPERhdGUsIG51bWJlcj47XG4gICAgZGF0ZXM6IERhdGVbXTtcbiAgICBtaW5EYXRlOiBEYXRlO1xuICAgIG1heERhdGU6IERhdGU7XG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtQZXJzb259IHBlcnNvblxuICAgICAqIEBwYXJhbSB7TWFwPERhdGUsbnVtYmVyPn0gbG9nIC0gbWFwcyBkYXRlcyBzdHJlbmd0aCBvZiBjb3ZpZC1zcGVjaWZpYyBzeW1wdG9tcyBvZiB0aGUgcGVyc29uIGF0IHRoYXQgZGF0ZS4gT05MWSBPTkUgUkVQT1JUIFBFUiBEQVkgQUxMT1dFRCEhIVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHBlcnNvbjogUGVyc29uLCBsb2c6IE1hcDxEYXRlLCBudW1iZXI+KSB7XG4gICAgICAgIHN1cGVyKHBlcnNvbik7XG4gICAgICAgIHRoaXMubG9nID0gbG9nO1xuICAgICAgICAvKipAdHlwZSB7RGF0ZVtdfSAqL1xuICAgICAgICB0aGlzLmRhdGVzID0gbmV3IEFycmF5KC4uLnRoaXMubG9nLmtleXMoKSk7XG4gICAgICAgIHRoaXMuZGF0ZXMuc29ydCgpO1xuICAgICAgICB0aGlzLm1pbkRhdGUgPSB0aGlzLmRhdGVzWzBdO1xuICAgICAgICB0aGlzLm1heERhdGUgPSB0aGlzLmRhdGVzW3RoaXMuZGF0ZXMubGVuZ3RoIC0gMV07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RGF0ZT99IGRhdGVPZkluZmVjdGlvbiAtIGRhdGUgYXQgd2hpY2ggYW4gaW5mZWN0aW9uIG9jY3VycyBvciBudWxsIHdoZW4gaXQgZG9lcyBub3Qgb2NjdXJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBwcm9iYWJpbGl0eSB0aGF0IHRoaXMgb2JzZXJ2YXRpb24gb2NjdXJzIGdpdmVuIGFuIGludmVjdGlvblxuICAgICAqL1xuICAgIGdldFByb2JhYmlsaXR5KGRhdGVPZkluZmVjdGlvbjogRGF0ZSB8IG51bGwpOiBudW1iZXIge1xuICAgICAgICBsZXQgdmlydXNSZXBvcnRSYXRlID0gMDtcbiAgICAgICAgbGV0IGluZmVjdGlvbk1hdGNoaW5nID0gVmlydXMubm9TeW1wdG9tUHJvYmFiaWxpdHk7IC8vaG93IG11Y2ggdGhlIGluZmVjdGlvbiBtYXRjaGVzIHdpdGggdGhlIHJlcG9ydCBkYXlzXG4gICAgICAgIGlmIChkYXRlT2ZJbmZlY3Rpb24pIHtcbiAgICAgICAgICAgIC8vaW5mZWN0ZWRcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0UmVsZXZhbnREYXkgPSBuZXcgRGF0ZShkYXRlT2ZJbmZlY3Rpb24uZ2V0VGltZSgpICsgVmlydXMuaW5jdWJhdGlvblRpbWUgKiBhbGdvcml0aG1pY0NvbnN0YW50cy5kYXlUb01TKTtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RSZWxldmFudERheSA9IG5ldyBEYXRlKGRhdGVPZkluZmVjdGlvbi5nZXRUaW1lKCkgKyBWaXJ1cy5lbmRPZkluZmVjdGlvc25lc3MgKiBhbGdvcml0aG1pY0NvbnN0YW50cy5kYXlUb01TKTtcbiAgICAgICAgICAgIGNvbnN0IHJlbGV2YW50UmVwb3J0RGF5cyA9IHRoaXMuZGF0ZXMuZmlsdGVyKChkYXRlKSA9PiBmaXJzdFJlbGV2YW50RGF5IDw9IGRhdGUgJiYgZGF0ZSA8PSBsYXN0UmVsZXZhbnREYXkpOy8vcmVwb3J0cyBpbiBpbmZlY3Rpb24gdGltZWZyYW1lXG4gICAgICAgICAgICBmb3IgKGxldCByZWxldmFudFJlcG9ydERheSBvZiByZWxldmFudFJlcG9ydERheXMpIHtcbiAgICAgICAgICAgICAgICBpbmZlY3Rpb25NYXRjaGluZyA9IDEgLSAoMSAtIGluZmVjdGlvbk1hdGNoaW5nKSAqICgxIC0gdGhpcy5sb2cuZ2V0KHJlbGV2YW50UmVwb3J0RGF5KSAvIHJlbGV2YW50UmVwb3J0RGF5cy5sZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5mZWN0aW9uTWF0Y2hpbmcgPSByZWxldmFudFJlcG9ydERheXMubGVuZ3RoIC8gVmlydXMuZW5kT2ZJbmZlY3Rpb3NuZXNzO1xuICAgICAgICB9XG4gICAgICAgIC8vbm90IGluZmVjdGVkXG4gICAgICAgIGxldCBhdmVyYWdlSWxsbmVzcyA9IDA7XG4gICAgICAgIGZvciAobGV0IGRheUxvZyBvZiB0aGlzLmxvZykge1xuICAgICAgICAgICAgYXZlcmFnZUlsbG5lc3MgKz0gZGF5TG9nWzFdO1xuICAgICAgICB9XG4gICAgICAgIGF2ZXJhZ2VJbGxuZXNzIC89IHRoaXMubG9nLnNpemU7XG4gICAgICAgIHJldHVybiB2aXJ1c1JlcG9ydFJhdGUgKiBpbmZlY3Rpb25NYXRjaGluZyArICgxIC0gdmlydXNSZXBvcnRSYXRlKSAqICgwLjkgLSAwLjggKiBhdmVyYWdlSWxsbmVzcyk7IC8vMC45IGlmIG5vIHN5bXB0b21zLCAwLjEgaWYgdG90YWwgc3ltcHRvbXNcbiAgICB9XG59IiwiXG5cbmV4cG9ydCBjbGFzcyBWaXJ1cyB7XG5cblxuICAgIC8qKiBkYXlzIGFmdGVyIGluZmVjdGlvbiB3aGVuIHlvdSBzdGFydCBiZWluZyBpbmZlY3Rpb3VzICovXG4gICAgc3RhdGljIHN0YXJ0T2ZJbmZlY3Rpb3NuZXNzID0gMjtcblxuICAgIC8qKiBkYXlzIGFmdGVyIGluZmVjdGlvbiB3aGVuIHlvdSBzdG9wIGJlaW5nIGluZmVjdGlvdXMgKi9cbiAgICBzdGF0aWMgZW5kT2ZJbmZlY3Rpb3NuZXNzID0gMTA7XG4gICAgLyoqZGF5cyBhZnRlciBmaXJzdCBzeW1wdG9tcyBvY2N1ciAqL1xuICAgIHN0YXRpYyBpbmN1YmF0aW9uVGltZSA9IDUuNTtcbiAgICAvKipwcm9iYWJpbGl0eSBvZiBub3QgaGF2aW5nIGFueSBzeW1wdG9tcyB3aXRoIHRoZSB2aXJ1cyAqL1xuICAgIHN0YXRpYyBub1N5bXB0b21Qcm9iYWJpbGl0eSA9IDAuNTU7XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtQZXJzb25Mb2d9IGxvZyBcbiAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgLSBkYXRlIHRvIGdldCBwcm9iYWJpbGl0eSBmcm9tXG4gICAgICogQHJldHVybnMge251bWJlcn0gLSBwcm9iYWJpbGl0eSBvZiBiZWluZyBpbmZlY3RlZCBhbmQgYWJsZSB0byBzcHJlYWQgdGhlIHZpcnVzIGF0IHRoYXQgZGF0ZVxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRBY3V0ZUluZmVjdGlvblByb2JhYmlsaXR5KGxvZzogeyBnZXRJbmZlY3Rpb25Qcm9iYWJpbGl0eTogKGFyZzA6IERhdGUpID0+IG51bWJlcjsgfSwgZGF0ZTogRGF0ZSkge1xuICAgICAgICBjb25zdCBzdGFydEluZmVjdGlvblBlcmlvZCA9IG5ldyBEYXRlKGRhdGUpOyBzdGFydEluZmVjdGlvblBlcmlvZC5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gVmlydXMuZW5kT2ZJbmZlY3Rpb3NuZXNzKTtcbiAgICAgICAgY29uc3QgZW5kSW5mZWN0aW9uUGVyaW9kID0gbmV3IERhdGUoZGF0ZSk7IGVuZEluZmVjdGlvblBlcmlvZC5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gVmlydXMuc3RhcnRPZkluZmVjdGlvc25lc3MpO1xuICAgICAgICByZXR1cm4gbG9nLmdldEluZmVjdGlvblByb2JhYmlsaXR5KGVuZEluZmVjdGlvblBlcmlvZCkgLSBsb2cuZ2V0SW5mZWN0aW9uUHJvYmFiaWxpdHkoc3RhcnRJbmZlY3Rpb25QZXJpb2QpO1xuICAgIH1cbiAgICBzdGF0aWMgZ2V0UHJvYmFiaWxpdHlPZkluZmVjdGlvdXNuZXNzKGluZmVjdGlvbkRhdGU6ICBEYXRlLCBjdXJyZW50RGF0ZTogRGF0ZSkge1xuICAgICAgICBjb25zdCBzdGFydEluZmVjdGlvblBlcmlvZCA9IG5ldyBEYXRlKGluZmVjdGlvbkRhdGUpOyBzdGFydEluZmVjdGlvblBlcmlvZC5zZXREYXRlKGluZmVjdGlvbkRhdGUuZ2V0RGF0ZSgpICsgVmlydXMuc3RhcnRPZkluZmVjdGlvc25lc3MpO1xuICAgICAgICBjb25zdCBlbmRJbmZlY3Rpb25QZXJpb2QgPSBuZXcgRGF0ZShpbmZlY3Rpb25EYXRlKTsgZW5kSW5mZWN0aW9uUGVyaW9kLnNldERhdGUoaW5mZWN0aW9uRGF0ZS5nZXREYXRlKCkgKyBWaXJ1cy5lbmRPZkluZmVjdGlvc25lc3MpO1xuICAgICAgICByZXR1cm4gKHN0YXJ0SW5mZWN0aW9uUGVyaW9kIDwgY3VycmVudERhdGUgJiYgY3VycmVudERhdGUgPCBlbmRJbmZlY3Rpb25QZXJpb2QpID8gMSA6IDA7XG4gICAgfVxufVxuIiwiZXhwb3J0IGNvbnN0IGFsZ29yaXRobWljQ29uc3RhbnRzID0ge1xuICAgIGRlbHRhVDogMC4xLFxuICAgIGRheVRvTVM6IDEwMDAgKiA2MCAqIDYwICogMjRcbn07IiwiaW1wb3J0IHsgQ29udGFjdCB9IGZyb20gXCIuL0NvbnRhY3RcIjtcbmltcG9ydCB7IFBlcnNvbiB9IGZyb20gXCIuL1BlcnNvblwiO1xuaW1wb3J0IHsgU2ltdWxhdGlvbiB9IGZyb20gXCIuL1NpbXVsYXRpb25cIjtcbmltcG9ydCB7IE9ic2VydmF0aW9uLCBUZXN0IH0gZnJvbSBcIi4vVGVzdFwiO1xuXG5pbnRlcmZhY2UgVGVzdFNlcmlhbGl6YXRpb24ge1xuICAgIHR5cGU6IHN0cmluZztcbiAgICBwZXJzb246IHN0cmluZztcbiAgICBkYXRlOiBEYXRlO1xuICAgIHBvc2l0aXZlOiBib29sZWFuO1xuICAgIHNlbnNpdGl2aXR5OiBudW1iZXI7XG4gICAgc3BlY2lmaWNpdHk6IG51bWJlcjtcbiAgICByZWxldmFudFRpbWVTdGFydDogRGF0ZTtcbiAgICByZWxldmFudFRpbWVFbmQ6IERhdGU7XG59XG5leHBvcnQgY2xhc3MgU2ltdWxhdGlvblNlcmlhbGl6YXRpb24ge1xuICAgIHBlcnNvbnM6IHtcbiAgICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgICB1bnRyYWNrZWRGcmVxdWVuY3k6IG51bWJlcjtcbiAgICAgICAgdW50cmFja2VkSW50ZW5zaXR5OiBudW1iZXI7XG4gICAgICAgIGFjdGl2aXR5U3RyaW5nOiBzdHJpbmc7XG4gICAgfVtdO1xuICAgIGNvbnRhY3RzOiB7XG4gICAgICAgIGE6IHN0cmluZztcbiAgICAgICAgYjogc3RyaW5nO1xuICAgICAgICBkYXRlOiBEYXRlO1xuICAgICAgICBpbnRlbnNpdHk6IG51bWJlcjtcbiAgICB9W107XG4gICAgdGVzdHM6IChUZXN0U2VyaWFsaXphdGlvbiB8IHtcbiAgICAgICAgdHlwZTogc3RyaW5nXG4gICAgfSlbXTtcbiAgICBpbml0aWFsRGF0ZTogRGF0ZTtcbiAgICBsYXN0RGF0ZTogRGF0ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVGVzdChvYnNlcnZhdGlvbjogT2JzZXJ2YXRpb24pOiBvYnNlcnZhdGlvbiBpcyBUZXN0IHtcbiAgICByZXR1cm4gKG9ic2VydmF0aW9uIGFzIFRlc3QpLmRhdGUgIT09IG51bGw7XG59XG5leHBvcnQgZnVuY3Rpb24gaXNTaW11bGF0aW9uU2VyaWFsaXphdGlvbihzZXJpYWxpemF0aW9uOiBhbnkpOiBzZXJpYWxpemF0aW9uIGlzIFNpbXVsYXRpb25TZXJpYWxpemF0aW9uIHtcbiAgICBpZighc2VyaWFsaXphdGlvbi5wZXJzb25zKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgcCA9IChzZXJpYWxpemF0aW9uIGFzIFNpbXVsYXRpb25TZXJpYWxpemF0aW9uKS5wZXJzb25zWzBdO1xuICAgIGlmIChwKSB7XG4gICAgICAgIGlmIChwLmFjdGl2aXR5U3RyaW5nKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVTaW11bGF0aW9uKHNpbXVsYXRpb246IFNpbXVsYXRpb24pOiBTaW11bGF0aW9uU2VyaWFsaXphdGlvbiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcGVyc29uczogc2ltdWxhdGlvbi5wZXJzb25BcnJheS5tYXAoKHBlcnNvbikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuYW1lOiBwZXJzb24ubmFtZSxcbiAgICAgICAgICAgICAgICB1bnRyYWNrZWRGcmVxdWVuY3k6IHBlcnNvbi51bnRyYWNrZWRGcmVxdWVuY3ksXG4gICAgICAgICAgICAgICAgdW50cmFja2VkSW50ZW5zaXR5OiBwZXJzb24udW50cmFja2VkSW50ZW5zaXR5LFxuICAgICAgICAgICAgICAgIGFjdGl2aXR5U3RyaW5nOiBwZXJzb24uZXh0ZXJuYWxBY3Rpdml0eS50b1N0cmluZygpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgICBjb250YWN0czogc2ltdWxhdGlvbi5jb250YWN0cy5tYXAoY29udGFjdCA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGE6IGNvbnRhY3QuYS5uYW1lLFxuICAgICAgICAgICAgICAgIGI6IGNvbnRhY3QuYi5uYW1lLFxuICAgICAgICAgICAgICAgIGRhdGU6IGNvbnRhY3QuZGF0ZSxcbiAgICAgICAgICAgICAgICBpbnRlbnNpdHk6IGNvbnRhY3QuaW50ZW5zaXR5LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSksXG4gICAgICAgIHRlc3RzOiBzaW11bGF0aW9uLm9ic2VydmF0aW9ucy5tYXAoKG9ic2VydmF0aW9uKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNUZXN0KG9ic2VydmF0aW9uKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiVGVzdFwiLFxuICAgICAgICAgICAgICAgICAgICBwZXJzb246IG9ic2VydmF0aW9uLnBlcnNvbi5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBkYXRlOiBvYnNlcnZhdGlvbi5kYXRlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGl2ZTogb2JzZXJ2YXRpb24ucG9zaXRpdmUsXG4gICAgICAgICAgICAgICAgICAgIHNlbnNpdGl2aXR5OiBvYnNlcnZhdGlvbi5zZW5zaXRpdml0eSxcbiAgICAgICAgICAgICAgICAgICAgc3BlY2lmaWNpdHk6IG9ic2VydmF0aW9uLnNwZWNpZmljaXR5LFxuICAgICAgICAgICAgICAgICAgICByZWxldmFudFRpbWVTdGFydDogb2JzZXJ2YXRpb24ucmVsZXZhbnRUaW1lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJlbGV2YW50VGltZUVuZDogb2JzZXJ2YXRpb24ucmVsZXZhbnRUaW1lRW5kXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInVua25vd25cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIGluaXRpYWxEYXRlOiBzaW11bGF0aW9uLmluaXRpYWxEYXRlLFxuICAgICAgICBsYXN0RGF0ZTogc2ltdWxhdGlvbi5sYXN0RGF0ZVxuICAgIH1cbn1cbmZ1bmN0aW9uIGlzVGVzdFNlcmlhbGl6YXRpb24odGVzdDogVGVzdFNlcmlhbGl6YXRpb24gfCB7IHR5cGU6IHN0cmluZyB9KTogdGVzdCBpcyBUZXN0U2VyaWFsaXphdGlvbiB7XG4gICAgcmV0dXJuIHRlc3QudHlwZSA9PSBcIlRlc3RcIjtcbn1cbmV4cG9ydCBmdW5jdGlvbiByZXZpdmUoc2VyaWFsaXphdGlvbjogU2ltdWxhdGlvblNlcmlhbGl6YXRpb24pIHtcbiAgICBjb25zdCBzaW0gPSBuZXcgU2ltdWxhdGlvbihzZXJpYWxpemF0aW9uLmluaXRpYWxEYXRlKTtcbiAgICBzaW0ubGFzdERhdGUgPSBzZXJpYWxpemF0aW9uLmxhc3REYXRlO1xuICAgIGZvciAobGV0IHBlcnNvblNlcmlhbGl6YXRpb24gb2Ygc2VyaWFsaXphdGlvbi5wZXJzb25zKSB7XG4gICAgICAgIHNpbS5hZGRQZXJzb24obmV3IFBlcnNvbihcbiAgICAgICAgICAgIHBlcnNvblNlcmlhbGl6YXRpb24ubmFtZSxcbiAgICAgICAgICAgIHBlcnNvblNlcmlhbGl6YXRpb24udW50cmFja2VkRnJlcXVlbmN5LFxuICAgICAgICAgICAgcGVyc29uU2VyaWFsaXphdGlvbi51bnRyYWNrZWRJbnRlbnNpdHksXG4gICAgICAgICAgICBldmFsKHBlcnNvblNlcmlhbGl6YXRpb24uYWN0aXZpdHlTdHJpbmcpXG4gICAgICAgICkpXG4gICAgfVxuICAgIGNvbnN0IHBlcnNvbkZyb21OYW1lID0gKG5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICBmb3IgKGxldCBwZXJzb24gb2Ygc2ltLnBlcnNvbnMpXG4gICAgICAgICAgICBpZiAocGVyc29uLm5hbWUgPT0gbmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwZXJzb247XG4gICAgICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBmb3IgKGxldCBjIG9mIHNlcmlhbGl6YXRpb24uY29udGFjdHMpIHtcbiAgICAgICAgc2ltLmFkZENvbnRhY3QobmV3IENvbnRhY3QoXG4gICAgICAgICAgICBwZXJzb25Gcm9tTmFtZShjLmEpLFxuICAgICAgICAgICAgcGVyc29uRnJvbU5hbWUoYy5iKSwge1xuICAgICAgICAgICAgZGF0ZTogYy5kYXRlLFxuICAgICAgICAgICAgaW50ZW5zaXR5OiBjLmludGVuc2l0eVxuICAgICAgICB9XG4gICAgICAgICkpXG4gICAgfVxuICAgIGZvciAobGV0IG9iIG9mIHNlcmlhbGl6YXRpb24udGVzdHMpIHtcbiAgICAgICAgaWYgKGlzVGVzdFNlcmlhbGl6YXRpb24ob2IpKSB7XG4gICAgICAgICAgICBjb25zdCB0b0FkZCA9IG5ldyBUZXN0KFxuICAgICAgICAgICAgICAgIHBlcnNvbkZyb21OYW1lKG9iLnBlcnNvbiksXG4gICAgICAgICAgICAgICAgb2IuZGF0ZSxcbiAgICAgICAgICAgICAgICBvYi5wb3NpdGl2ZSxcbiAgICAgICAgICAgICAgICBvYi5zZW5zaXRpdml0eSxcbiAgICAgICAgICAgICAgICBvYi5zcGVjaWZpY2l0eVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRvQWRkLnJlbGV2YW50VGltZVN0YXJ0ID0gb2IucmVsZXZhbnRUaW1lU3RhcnQ7XG4gICAgICAgICAgICB0b0FkZC5yZWxldmFudFRpbWVFbmQgPSBvYi5yZWxldmFudFRpbWVFbmQ7XG4gICAgICAgICAgICBzaW0ub2JzZXJ2YXRpb25zLnB1c2godG9BZGQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzaW07XG59XG5cbmNvbnN0IGRhdGVLZXlzID0gbmV3IFNldChbXCJkYXRlXCIsIFwiaW5pdGlhbERhdGVcIiwgXCJsYXN0RGF0ZVwiLFwicmVsZXZhbnRUaW1lU3RhcnRcIixcInJlbGV2YW50VGltZUVuZFwiXSlcbmV4cG9ydCBmdW5jdGlvbiB0cnlQYXJzZVN0cmluZyhqc29uU3RyaW5nOiBzdHJpbmcpIHtcblxuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UoanNvblN0cmluZywgKGtleSwgdmFsKSA9PiB7XG4gICAgICAgIGlmIChkYXRlS2V5cy5oYXMoa2V5KSlcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZSh2YWwpO1xuICAgICAgICByZXR1cm4gdmFsXG4gICAgfSk7XG4gICAgaWYgKGlzU2ltdWxhdGlvblNlcmlhbGl6YXRpb24ocGFyc2VkKSkge1xuICAgICAgICBjb25zdCBzaW11bGF0aW9uID0gcmV2aXZlKHBhcnNlZCk7XG4gICAgICAgIHJldHVybiBzaW11bGF0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn0iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHRpZihfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdKSB7XG5cdFx0cmV0dXJuIF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0uZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlXG5fX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9zcmMvU2ltdWxhdGlvbldvcmtlci50c1wiKTtcbi8vIFRoaXMgZW50cnkgbW9kdWxlIHVzZWQgJ2V4cG9ydHMnIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbiJdLCJzb3VyY2VSb290IjoiIn0=