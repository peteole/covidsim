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
                while (index + 1 < personValues.length && personValues[index + 1] && personValues[index + 1].date < date)
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9TaW11bGF0aW9uV29ya2VyLnRzIiwid2VicGFjazovL2Nvdmlkc2ltLy4vc3JjL2xvZ2ljL0NvbnRhY3QudHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvUGVyc29uLnRzIiwid2VicGFjazovL2Nvdmlkc2ltLy4vc3JjL2xvZ2ljL1NpbXVsYXRpb24udHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvVGVzdC50cyIsIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9sb2dpYy9WaXJ1cy50cyIsIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9sb2dpYy9jb25zdGFudHMudHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvc2ltdWxhdGlvblNlcmlhbGl6YXRpb24udHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vY292aWRzaW0vd2VicGFjay9zdGFydHVwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLGdHQUFnRDtBQUNoRCx1SUFBbUY7QUFFbkYsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUM7QUFDcEMsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLENBQUM7QUFDdEMsSUFBSSxpQkFBaUIsR0FBRyxNQUFNLENBQUM7QUFDL0IsSUFBSSxVQUFVLEdBQUcsR0FBRyxDQUFDO0FBQ3JCLElBQUksU0FBUyxHQUdBLElBQUksQ0FBQztBQUdsQixTQUFTLFFBQVEsQ0FBQyxJQUFTO0lBQ3ZCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUNqQixPQUFPLElBQUksQ0FBQztLQUNmO0lBQ0QsT0FBTyxLQUFLLENBQUM7QUFDakIsQ0FBQztBQUNELFNBQVMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFO0lBQ2YsSUFBSSxtREFBeUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDcEMsTUFBTSxV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ZW50IjpbImltcG9ydCB7IFBlcnNvbiB9IGZyb20gXCIuL2xvZ2ljL1BlcnNvblwiO1xuaW1wb3J0IHsgU2ltdWxhdGlvbiB9IGZyb20gXCIuL2xvZ2ljL1NpbXVsYXRpb25cIjtcbmltcG9ydCB7IGlzU2ltdWxhdGlvblNlcmlhbGl6YXRpb24sIHJldml2ZSB9IGZyb20gXCIuL2xvZ2ljL3NpbXVsYXRpb25TZXJpYWxpemF0aW9uXCJcblxuY29uc3QgbWF4U2ltdWxhdGlvblJ1bnMgPSAxMDAwMDAwMDA7XG5jb25zdCBncmFwaGljc1VwZGF0ZUludGVydmFsID0gMTAwMDAwO1xubGV0IGV4YWN0bmVzVGhyZXNob2xkID0gMC4wMDAxO1xubGV0IHJlc29sdXRpb24gPSAwLjE7XG5sZXQgbGFzdEFycmF5OiB7XG4gICAgZGF0ZTogRGF0ZTtcbiAgICB2YWx1ZXM6IG51bWJlcltdO1xufVtdIHwgbnVsbCA9IG51bGw7XG5cblxuZnVuY3Rpb24gaXNDb25maWcoZGF0YTogYW55KTogZGF0YSBpcyB7IHJlc29sdXRpb246IG51bWJlciAsIGFjY3VyYWN5Om51bWJlcn0ge1xuICAgIGlmIChkYXRhLnJlc29sdXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbm9ubWVzc2FnZSA9IChldikgPT4ge1xuICAgIGlmIChpc1NpbXVsYXRpb25TZXJpYWxpemF0aW9uKGV2LmRhdGEpKSB7XG4gICAgICAgIGNvbnN0IHNpbXVsYXRpb24gPSByZXZpdmUoZXYuZGF0YSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdHM6IHtcbiAgICAgICAgICAgIHByb2JhYmlsaXR5OiBudW1iZXI7XG4gICAgICAgICAgICByZXN1bHQ6IE1hcDxQZXJzb24sIERhdGU+O1xuICAgICAgICB9W10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBtYXhTaW11bGF0aW9uUnVuczsgaSsrKSB7XG4gICAgICAgICAgICByZXN1bHRzLnB1c2goc2ltdWxhdGlvbi5zaW11bGF0ZU9uY2UoKSk7XG4gICAgICAgICAgICBpZiAoaSAlIGdyYXBoaWNzVXBkYXRlSW50ZXJ2YWwgPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NlZCA9IHNpbXVsYXRpb24ucHJvY2Vzc1NpbXVsYXRpb25SZXN1bHRzKHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFycmF5ID0gU2ltdWxhdGlvbi50b0FycmF5KHByb2Nlc3NlZCwgcmVzb2x1dGlvbiwgc2ltdWxhdGlvbi5sYXN0RGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICAgICAgICAgICAgICAgIGFycmF5OiBhcnJheSxcbiAgICAgICAgICAgICAgICAgICAgcGVyc29uczogc2ltdWxhdGlvbi5wZXJzb25BcnJheS5tYXAocGVyc29uID0+IHBlcnNvbi5uYW1lKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBjdHg6IFdvcmtlciA9IHNlbGYgYXMgYW55O1xuICAgICAgICAgICAgICAgIGN0eC5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBpZiAobGFzdEFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY2hlY2sgZm9yIGRpZmZlcmVuY2UgYW5kIGJyZWFrIGlmIHNtYWxsIGVub3VnaFxuICAgICAgICAgICAgICAgICAgICBsZXQgZGlmZmVyZW5jZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhcG9pbnQgPSBhcnJheVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhc3REYXRhcG9pbnQgPSBsYXN0QXJyYXlbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGRhdGFwb2ludC52YWx1ZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmZXJlbmNlICs9IE1hdGguYWJzKGRhdGFwb2ludC52YWx1ZXNbal0gLSBsYXN0RGF0YXBvaW50LnZhbHVlc1tqXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGlmZmVyZW5jZSAvPSBsYXN0QXJyYXkubGVuZ3RoICogbGFzdEFycmF5WzBdLnZhbHVlcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRpZmZlcmVuY2UpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlmZmVyZW5jZSA8IGV4YWN0bmVzVGhyZXNob2xkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGFzdEFycmF5ID0gYXJyYXk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9ZWxzZSBpZihpc0NvbmZpZyhldi5kYXRhKSl7XG4gICAgICAgIHJlc29sdXRpb249ZXYuZGF0YS5yZXNvbHV0aW9uO1xuICAgICAgICBleGFjdG5lc1RocmVzaG9sZD1ldi5kYXRhLmFjY3VyYWN5O1xuICAgIH1cbn0iLCJpbXBvcnQge1BlcnNvbn0gZnJvbSBcIi4vUGVyc29uXCI7XG5cbi8qKlxuICogQGNsYXNzXG4gKiBAcHJvcGVydHkge251bWJlcj99IGludGVuc2l0eSAtIFByb2JhYmlsaXR5IG9mIGluZmVjdGluZyB0aGUgb3RoZXIgb25lXG4gKiBAcHJvcGVydHkge0RhdGU/fSBkYXRlXG4gKi9cbmNsYXNzIENvbnRhY3RPcHRpb25ze1xuICAgIGludGVuc2l0eTpudW1iZXI9MC41O1xuICAgIGRhdGU6RGF0ZT1uZXcgRGF0ZSgpO1xufVxuXG4vKipcbiAqIEBjbGFzc1xuICogQGV4dGVuZHMge0NvbnRhY3RPcHRpb25zfVxuICovXG5leHBvcnQgY2xhc3MgQ29udGFjdCBleHRlbmRzIENvbnRhY3RPcHRpb25ze1xuICAgIGE6IFBlcnNvbjtcbiAgICBiOiBQZXJzb247XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtQZXJzb259IGEgXG4gICAgICogQHBhcmFtIHtQZXJzb259IGIgXG4gICAgICogQHBhcmFtIHtDb250YWN0T3B0aW9uc30gb3B0aW9ucyBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhOiBQZXJzb24sYjogUGVyc29uLG9wdGlvbnM6IENvbnRhY3RPcHRpb25zKXtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5hPWE7XG4gICAgICAgIHRoaXMuYj1iO1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMsb3B0aW9ucyk7XG4gICAgfVxuICAgIHByb2Nlc3MoKXtcbiAgICAgICAgXG4gICAgfVxufSIsImltcG9ydCB7IGFsZ29yaXRobWljQ29uc3RhbnRzIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbi8qKlxuICogQHR5cGVkZWYgeyhkYXRlOkRhdGUpPT57Y29udGFjdERlbnNpdHk6bnVtYmVyLGNvbnRhY3RJbnRlbnNpdHk6bnVtYmVyfX0gdW50cmFja2VkQWN0aXZpdHlcbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIFVudHJhY2tlZENvbnRhY3QgIHtcbiAgICAvKiotZGF0ZSBhdCB3aGljaCB0aGUgY29udGFjdCB0YWtlcyBwbGFjZSAqL1xuICAgIGRhdGU6IERhdGU7XG4gICAgLyoqcGVyc29uIGhhdmluZyBhbiB1bnRyYWNrZWQgY29udGFjdCAqL1xuICAgIHBlcnNvbjogUGVyc29uO1xuICAgIC8qKnByb2JhYmlsaXR5IG9mIHRyYW5zbWlzc2lvbiBpZiBvbmUgb2YgdGhlIHBlcnNvbnMgaXMgaW5mZWN0ZWQgYW5kIHRoZSBvdGhlciBvbmUgbm90ICovXG4gICAgaW50ZW5zaXR5OiBudW1iZXI7XG4gICAgLyoqd2hldGhlciBvdGhlciBwZXJzb24gaXMgaW5mZWN0ZWQgYWN1dGVseSAqL1xuICAgIGFjdXRlSW5mZWN0ZWQ6IGJvb2xlYW47XG4gICAgLyoqd2hldGhlciB0aGUgb3RoZXIgcGVyc29uIHdhcyBpbmZlY3RlZCBhdCBhbnkgcG9pbnQgaW4gdGltZSAqL1xuICAgIGV2ZXJJbmZlY3RlZDogYm9vbGVhbjtcbn1cbi8qKiBnZW5lcmF0ZXMgbmV4dCB1bnRyYWNrZWQgY29udGFjdCBzdGFydGluZyBhdCBhIGdpdmVuIGRhdGUgKi9cbmV4cG9ydCB0eXBlIHVudHJhY2tlZENvbnRhY3RHZW5lcmF0b3I9KGRhdGU6RGF0ZSxwZXJzb246UGVyc29uKT0+VW50cmFja2VkQ29udGFjdDtcblxuY29uc3QgZGVmYXVsdENvbnRhY3RHZW5lcmF0b3I6dW50cmFja2VkQ29udGFjdEdlbmVyYXRvciA9IChkYXRlOiBEYXRlLCBwZXJzb246IFBlcnNvbikgPT4gKHtcbiAgICBkYXRlOiBuZXcgRGF0ZShkYXRlLmdldFRpbWUoKSArIDIgKiBwZXJzb24udW50cmFja2VkRnJlcXVlbmN5ICogTWF0aC5yYW5kb20oKSAqIDEwMDAqNjAqNjAqMjQpLFxuICAgIGFjdXRlSW5mZWN0ZWQ6IDAuMDAxID4gTWF0aC5yYW5kb20oKSxcbiAgICBldmVySW5mZWN0ZWQ6IDAuMDEgPiBNYXRoLnJhbmRvbSgpLFxuICAgIGludGVuc2l0eTogMiAqIE1hdGgucmFuZG9tKCkgKiBwZXJzb24udW50cmFja2VkSW50ZW5zaXR5LFxuICAgIHBlcnNvbjogcGVyc29uXG59KTtcbi8qKlxuICogQ2xhc3MgcmVwcmVzZW50aW5nIHBlcnNvbnMgaW4gdGhlIHJlYWwgd29ybGQuXG4gKi9cbmV4cG9ydCBjbGFzcyBQZXJzb24ge1xuICAgIG5hbWU6IHN0cmluZztcbiAgICB1bnRyYWNrZWRGcmVxdWVuY3k6IG51bWJlcjtcbiAgICB1bnRyYWNrZWRJbnRlbnNpdHk6IG51bWJlcjtcbiAgICBleHRlcm5hbEFjdGl2aXR5OiB1bnRyYWNrZWRDb250YWN0R2VuZXJhdG9yO1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAgICogQHBhcmFtIHt1bnRyYWNrZWRDb250YWN0R2VuZXJhdG9yfSBleHRlcm5hbEFjdGl2aXR5IC0gZ2VuZXJhdGVzIG5leHQgY29udGFjdCBvZiBwZXJzb24gc3RhcnRpbmcgYXQgZ2l2ZW4gZGF0ZVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgdW50cmFja2VkRnJlcXVlbmN5ID0gMSwgdW50cmFja2VkSW50ZW5zaXR5ID0gMC4xLCBleHRlcm5hbEFjdGl2aXR5OnVudHJhY2tlZENvbnRhY3RHZW5lcmF0b3IgPSBkZWZhdWx0Q29udGFjdEdlbmVyYXRvcikge1xuICAgICAgICB0aGlzLmV4dGVybmFsQWN0aXZpdHkgPSBleHRlcm5hbEFjdGl2aXR5O1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLnVudHJhY2tlZEZyZXF1ZW5jeSA9IHVudHJhY2tlZEZyZXF1ZW5jeTtcbiAgICAgICAgdGhpcy51bnRyYWNrZWRJbnRlbnNpdHkgPSB1bnRyYWNrZWRJbnRlbnNpdHk7XG4gICAgfVxufSIsImltcG9ydCB7IFBlcnNvbiwgVW50cmFja2VkQ29udGFjdCB9IGZyb20gXCIuL1BlcnNvblwiO1xuaW1wb3J0IHsgQ29udGFjdCB9IGZyb20gXCIuL0NvbnRhY3RcIjtcbmltcG9ydCB7IFZpcnVzIH0gZnJvbSBcIi4vVmlydXNcIjtcbmltcG9ydCB7IE9ic2VydmF0aW9uLCBUZXN0IH0gZnJvbSBcIi4vVGVzdFwiO1xuaW1wb3J0IHsgYWxnb3JpdGhtaWNDb25zdGFudHMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzVW50cmFja2VkKGNvbnRhY3Q6IFVudHJhY2tlZENvbnRhY3QgfCBDb250YWN0KTogY29udGFjdCBpcyBVbnRyYWNrZWRDb250YWN0IHtcbiAgICByZXR1cm4gKGNvbnRhY3QgYXMgVW50cmFja2VkQ29udGFjdCkucGVyc29uICE9IG51bGw7XG59XG4vKipcbiAqIFNpbXVsYXRpb24gb2YgYW4gaW5mZWN0aW9uLiBQcm92aWRlcyB0aGUgZnVuY3Rpb25hbGl0eSB0byBzaW11bGF0ZSB0aGUgcGxvdCBtYW55IHRpbWVzIHRvIGFwcHJveGltYXRlIHByb2JhYmlsaXRpZXMgYXQgZ2l2ZW4gdGVzdCByZXN1bHRzXG4gKi9cbmV4cG9ydCBjbGFzcyBTaW11bGF0aW9uIHtcbiAgICBvYnNlcnZhdGlvbnM6IE9ic2VydmF0aW9uW107XG4gICAgaW5pdGlhbERhdGU6IERhdGU7XG4gICAgbGFzdERhdGU6IERhdGU7XG4gICAgcGVyc29uczogU2V0PFBlcnNvbj47XG4gICAgY29udGFjdHM6IENvbnRhY3RbXTtcbiAgICBwZXJzb25Ub0luaXRpYWxJbmZlY3Rpb25EYXRlOiBNYXA8UGVyc29uLCAoKSA9PiBEYXRlPjtcbiAgICBjb25zdHJ1Y3Rvcihpbml0aWFsRGF0ZTogRGF0ZSA9IG5ldyBEYXRlKCksIG9ic2VydmF0aW9uczogT2JzZXJ2YXRpb25bXSA9IFtdKSB7XG4gICAgICAgIHRoaXMub2JzZXJ2YXRpb25zID0gb2JzZXJ2YXRpb25zO1xuICAgICAgICB0aGlzLmluaXRpYWxEYXRlID0gaW5pdGlhbERhdGU7XG4gICAgICAgIHRoaXMubGFzdERhdGUgPSBpbml0aWFsRGF0ZTtcbiAgICAgICAgLyoqQHR5cGUge1NldDxQZXJzb24+fSovXG4gICAgICAgIHRoaXMucGVyc29ucyA9IG5ldyBTZXQoKTtcbiAgICAgICAgLyoqIEB0eXBlIHtDb250YWN0W119ICovXG4gICAgICAgIHRoaXMuY29udGFjdHMgPSBbXTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFzc2lnbnMgYSBmdW5jdGlvbiB0byBlYWNoIHBlcnNvbiB3aGljaCBnZW5lcmF0ZXMgYW4gaW5pdGlhbCBpbmZlY3Rpb24gZGF0ZSAob3IgbnVsbCBpZiBubyBpbmZlY3Rpb24gaGFwcGVuZWQpXG4gICAgICAgICAqIEB0eXBlIHtNYXA8UGVyc29uLCgpPT5EYXRlP31cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucGVyc29uVG9Jbml0aWFsSW5mZWN0aW9uRGF0ZSA9IG5ldyBNYXAoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtQZXJzb259IHBlcnNvbiBcbiAgICAgKiBAcGFyYW0geygpPT5EYXRlP30gZGF0ZUdlbmVyYXRvciAtZnVuY3Rpb24gd2hpY2ggZ2VuZXJhdGVzIGFuIGluaXRpYWwgaW5mZWN0aW9uIGRhdGUgKG9yIG51bGwgaWYgbm8gaW5mZWN0aW9uIGhhcHBlbmVkKVxuICAgICAqL1xuICAgIHNldEluZmVjdGlvbkRhdGVGdW5jdGlvbihwZXJzb246IFBlcnNvbiwgZGF0ZUdlbmVyYXRvcjogKCkgPT4gRGF0ZSB8IG51bGwpIHtcbiAgICAgICAgdGhpcy5wZXJzb25Ub0luaXRpYWxJbmZlY3Rpb25EYXRlLnNldChwZXJzb24sIGRhdGVHZW5lcmF0b3IpO1xuICAgIH1cbiAgICAvKipAcGFyYW0ge1BlcnNvbn0gdG9BZGQgKi9cbiAgICBhZGRQZXJzb24odG9BZGQ6IFBlcnNvbikge1xuICAgICAgICB0aGlzLnBlcnNvbnMuYWRkKHRvQWRkKTtcblxuICAgICAgICB0aGlzLnBlcnNvblRvSW5pdGlhbEluZmVjdGlvbkRhdGUuc2V0KHRvQWRkLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IDAuMDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUodGhpcy5pbml0aWFsRGF0ZS5nZXRUaW1lKCkgLSBNYXRoLnJhbmRvbSgpICogMTAwICogYWxnb3JpdGhtaWNDb25zdGFudHMuZGF5VG9NUyk7Ly9yYW5kb20gZGF5IGluIHRoZSBsYXN0IDEwMCBkYXlzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKiBAcGFyYW0ge0NvbnRhY3R9IHRvQWRkIC0gY29udGFjdCB0byBiZSBhZGRlZCB0byB0aGUgcHJvY2Vzc2lvbiBsaXN0ICovXG4gICAgYWRkQ29udGFjdCh0b0FkZDogQ29udGFjdCkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY29udGFjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0b0FkZC5kYXRlLmdldFRpbWUoKSA8IHRoaXMuY29udGFjdHNbaV0uZGF0ZS5nZXRUaW1lKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRhY3RzLnNwbGljZShpLCAwLCB0b0FkZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5wZXJzb25zLmFkZCh0b0FkZC5hKTtcbiAgICAgICAgICAgICAgICB0aGlzLnBlcnNvbnMuYWRkKHRvQWRkLmIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbnRhY3RzLnB1c2godG9BZGQpO1xuICAgICAgICB0aGlzLmFkZFBlcnNvbih0b0FkZC5hKTtcbiAgICAgICAgdGhpcy5hZGRQZXJzb24odG9BZGQuYik7XG4gICAgICAgIGlmICh0aGlzLmxhc3REYXRlIDwgdG9BZGQuZGF0ZSlcbiAgICAgICAgICAgIHRoaXMubGFzdERhdGUgPSB0b0FkZC5kYXRlO1xuICAgIH1cbiAgICAvKipvcmRlciBjb250YWN0cyB0byBhdm9pZCBhbnkgZXJyb3JzICovXG4gICAgcmVmcmVzaENvbnRhY3RzKCkge1xuICAgICAgICB0aGlzLmNvbnRhY3RzLnNvcnQoKGEsIGIpID0+IGEuZGF0ZS5nZXRUaW1lKCkgLSBiLmRhdGUuZ2V0VGltZSgpKTtcbiAgICAgICAgaWYgKHRoaXMuY29udGFjdHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5sYXN0RGF0ZSA9IHRoaXMuY29udGFjdHNbdGhpcy5jb250YWN0cy5sZW5ndGggLSAxXS5kYXRlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IG8gb2YgdGhpcy5vYnNlcnZhdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChvIGluc3RhbmNlb2YgVGVzdCAmJiBvLmRhdGUgJiYgby5kYXRlID4gdGhpcy5sYXN0RGF0ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMubGFzdERhdGUgPSBvLmRhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY29udGFjdHMubGVuZ3RoID4gMCAmJiB0aGlzLmluaXRpYWxEYXRlID4gdGhpcy5jb250YWN0c1swXS5kYXRlKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxEYXRlID0gdGhpcy5jb250YWN0c1swXS5kYXRlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHNpbXVsYXRlT25jZSgpIHtcbiAgICAgICAgdGhpcy5yZWZyZXNoQ29udGFjdHMoKTtcbiAgICAgICAgY29uc3QgbGFzdERhdGVUb1NpbXVsYXRlID0gdGhpcy5sYXN0RGF0ZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEB0eXBlIHtNYXA8UGVyc29uLERhdGU+fVxuICAgICAgICAgKi9cbiAgICAgICAgY29uc3QgcmVzdWx0OiBNYXA8UGVyc29uLCBEYXRlPiA9IG5ldyBNYXAoKTtcbiAgICAgICAgLyoqQHR5cGUge1VudHJhY2tlZENvbnRhY3R8Q29udGFjdClbXX0gKi9cbiAgICAgICAgY29uc3QgZXZlbnRzOiAoVW50cmFja2VkQ29udGFjdCB8IENvbnRhY3QpW10gPSBuZXcgQXJyYXkoLi4udGhpcy5jb250YWN0cyk7XG4gICAgICAgIC8qKkB0eXBlIHsoY29udGFjdDppbXBvcnQoXCIuL1BlcnNvbi5qc1wiKS5VbnRyYWNrZWRDb250YWN0KT0+dm9pZH0gKi9cbiAgICAgICAgY29uc3QgYWRkVW50cmFja2VkQ29udGFjdDogKGNvbnRhY3Q6IFVudHJhY2tlZENvbnRhY3QpID0+IHZvaWQgPSAoY29uc3RhY3QpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBjb25zdGFjdC5kYXRlO1xuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBldmVudHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnRzW2ldLmRhdGUgPiBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50cy5zcGxpY2UoTnVtYmVyLnBhcnNlSW50KGkpLCAwLCBjb25zdGFjdCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBldmVudHMucHVzaChjb25zdGFjdCk7XG4gICAgICAgIH07XG4gICAgICAgIGZvciAobGV0IHBlcnNvbiBvZiB0aGlzLnBlcnNvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGluaXRpYWxEYXRlID0gdGhpcy5wZXJzb25Ub0luaXRpYWxJbmZlY3Rpb25EYXRlLmdldChwZXJzb24pKCk7XG4gICAgICAgICAgICByZXN1bHQuc2V0KHBlcnNvbiwgaW5pdGlhbERhdGUpO1xuICAgICAgICAgICAgZm9yIChsZXQgY29udGFjdCA9IHBlcnNvbi5leHRlcm5hbEFjdGl2aXR5KHRoaXMuaW5pdGlhbERhdGUsIHBlcnNvbik7IGNvbnRhY3QuZGF0ZSA8IGxhc3REYXRlVG9TaW11bGF0ZTsgY29udGFjdCA9IHBlcnNvbi5leHRlcm5hbEFjdGl2aXR5KGNvbnRhY3QuZGF0ZSwgcGVyc29uKSkge1xuICAgICAgICAgICAgICAgIGlmIChjb250YWN0LmFjdXRlSW5mZWN0ZWQpXG4gICAgICAgICAgICAgICAgICAgIGFkZFVudHJhY2tlZENvbnRhY3QoY29udGFjdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgY29udGFjdCBvZiBldmVudHMpIHtcbiAgICAgICAgICAgIGlmIChpc1VudHJhY2tlZChjb250YWN0KSkge1xuICAgICAgICAgICAgICAgIC8vY29udGFjdCBpcyB1bnRyYWNrZWQuIFRoaXMgaXMgb25seSB0cmlnZ2VyZWQgaWYgdGhlIG90aGVyIHBlcnNvbiBpcyBpbmZlY3RlZFxuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0LmdldChjb250YWN0LnBlcnNvbikgJiYgTWF0aC5yYW5kb20oKSA8IGNvbnRhY3QuaW50ZW5zaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXQoY29udGFjdC5wZXJzb24sIGNvbnRhY3QuZGF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9jb250YWN0IGlzIHRyYWNrZWRcbiAgICAgICAgICAgIGNvbnN0IGFEYXRlID0gcmVzdWx0LmdldChjb250YWN0LmEpO1xuICAgICAgICAgICAgY29uc3QgYkRhdGUgPSByZXN1bHQuZ2V0KGNvbnRhY3QuYik7XG4gICAgICAgICAgICAvLyBpZiBib3RoIG9yIG5vbmUgaXMgaW5mZWN0ZWQgbm90aGluZyBoYXBwZW5zXG4gICAgICAgICAgICBpZiAoYURhdGUgJiYgYkRhdGUgfHwgIWFEYXRlICYmICFiRGF0ZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGlmIChhRGF0ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2JhYmlsaXR5T2ZJbmZlY3Rpb24gPSBjb250YWN0LmludGVuc2l0eSAqIFZpcnVzLmdldFByb2JhYmlsaXR5T2ZJbmZlY3Rpb3VzbmVzcyhhRGF0ZSwgY29udGFjdC5kYXRlKTtcbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IHByb2JhYmlsaXR5T2ZJbmZlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldChjb250YWN0LmIsIGNvbnRhY3QuZGF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGJEYXRlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvYmFiaWxpdHlPZkluZmVjdGlvbiA9IGNvbnRhY3QuaW50ZW5zaXR5ICogVmlydXMuZ2V0UHJvYmFiaWxpdHlPZkluZmVjdGlvdXNuZXNzKGJEYXRlLCBjb250YWN0LmRhdGUpO1xuICAgICAgICAgICAgICAgIGlmIChwcm9iYWJpbGl0eU9mSW5mZWN0aW9uIDw9IDApXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgcHJvYmFiaWxpdHlPZkluZmVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0KGNvbnRhY3QuYSwgY29udGFjdC5kYXRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHByb2JhYmlsaXR5ID0gMTtcbiAgICAgICAgZm9yIChsZXQgb2JzZXJ2YXRpb24gb2YgdGhpcy5vYnNlcnZhdGlvbnMpIHtcbiAgICAgICAgICAgIHByb2JhYmlsaXR5ICo9IG9ic2VydmF0aW9uLmdldFByb2JhYmlsaXR5KHJlc3VsdC5nZXQob2JzZXJ2YXRpb24ucGVyc29uKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHByb2JhYmlsaXR5OiBwcm9iYWJpbGl0eSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVzdWx0XG4gICAgICAgIH07XG4gICAgfVxuICAgIHByb2Nlc3NTaW11bGF0aW9uUmVzdWx0cyhyZXN1bHRzOiB7IHJlc3VsdDogTWFwPFBlcnNvbiwgRGF0ZT47IHByb2JhYmlsaXR5OiBudW1iZXI7IH1bXSkge1xuXG4gICAgICAgIGxldCBwcm9iYWJpbGl0eVN1bSA9IDA7XG4gICAgICAgIGZvciAobGV0IHJlc3VsdCBvZiByZXN1bHRzKVxuICAgICAgICAgICAgcHJvYmFiaWxpdHlTdW0gKz0gcmVzdWx0LnByb2JhYmlsaXR5O1xuICAgICAgICAvKipAdHlwZSB7TWFwPFBlcnNvbixudW1iZXI+fSAqL1xuICAgICAgICBjb25zdCB0b3RhbEluZmVjdGlvblByb2JhYmlsaXR5OiBNYXA8UGVyc29uLCBudW1iZXI+ID0gbmV3IE1hcCgpO1xuICAgICAgICBmb3IgKGxldCBwZXJzb24gb2YgdGhpcy5wZXJzb25zKSB7XG4gICAgICAgICAgICB0b3RhbEluZmVjdGlvblByb2JhYmlsaXR5LnNldChwZXJzb24sIDApO1xuICAgICAgICB9XG4gICAgICAgIC8qKkB0eXBlIHtNYXA8UGVyc29uLHtkYXRlOkRhdGUscDpudW1iZXIsIHBBY2M6bnVtYmVyP31bXT59ICovXG4gICAgICAgIGNvbnN0IGluZmVjdGlvbkRhdGVzOiBNYXA8UGVyc29uLCB7IGRhdGU6IERhdGU7IHA6IG51bWJlcjsgcEFjYzogbnVtYmVyIHwgbnVsbDsgfVtdPiA9IG5ldyBNYXAoKTtcbiAgICAgICAgZm9yIChsZXQgcGVyc29uIG9mIHRoaXMucGVyc29ucylcbiAgICAgICAgICAgIGluZmVjdGlvbkRhdGVzLnNldChwZXJzb24sIFtdKTtcbiAgICAgICAgZm9yIChsZXQgcmVzdWx0IG9mIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIGNvbnN0IHJlYWxQcm9iID0gcmVzdWx0LnByb2JhYmlsaXR5IC8gcHJvYmFiaWxpdHlTdW07XG5cbiAgICAgICAgICAgIGZvciAobGV0IHBlcnNvbiBvZiB0aGlzLnBlcnNvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnJlc3VsdC5nZXQocGVyc29uKSlcbiAgICAgICAgICAgICAgICAgICAgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eS5zZXQocGVyc29uLCB0b3RhbEluZmVjdGlvblByb2JhYmlsaXR5LmdldChwZXJzb24pICsgcmVhbFByb2IpO1xuICAgICAgICAgICAgICAgIGluZmVjdGlvbkRhdGVzLmdldChwZXJzb24pLnB1c2goeyBkYXRlOiByZXN1bHQucmVzdWx0LmdldChwZXJzb24pLCBwOiByZWFsUHJvYiwgcEFjYzogbnVsbCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBwZXJzb24gb2YgdGhpcy5wZXJzb25zKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZlY3Rpb25EYXRlc1BlcnNvbiA9IGluZmVjdGlvbkRhdGVzLmdldChwZXJzb24pO1xuICAgICAgICAgICAgaW5mZWN0aW9uRGF0ZXNQZXJzb24uc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghYS5kYXRlICYmICFiLmRhdGUpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgIGlmICghYS5kYXRlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICBpZiAoIWIuZGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgICAgIHJldHVybiBhLmRhdGUuZ2V0VGltZSgpIC0gYi5kYXRlLmdldFRpbWUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbGV0IGFjY3VtdWxhdGVkUHJvYiA9IDA7XG4gICAgICAgICAgICBmb3IgKGxldCBkYXRlIG9mIGluZmVjdGlvbkRhdGVzUGVyc29uKSB7XG4gICAgICAgICAgICAgICAgYWNjdW11bGF0ZWRQcm9iICs9IGRhdGUucDtcbiAgICAgICAgICAgICAgICBkYXRlLnBBY2MgPSBhY2N1bXVsYXRlZFByb2I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaW5pdGlhbERhdGU6IHRoaXMuaW5pdGlhbERhdGUsXG4gICAgICAgICAgICB0b3RhbEluZmVjdGlvblByb2JhYmlsaXR5OiB0b3RhbEluZmVjdGlvblByb2JhYmlsaXR5LFxuICAgICAgICAgICAgaW5mZWN0aW9uVGltZWxpbmU6IGluZmVjdGlvbkRhdGVzXG4gICAgICAgIH07XG4gICAgfVxuICAgIHNpbXVsYXRlKHJ1bnM6IG51bWJlcikge1xuICAgICAgICBjb25zdCByZXN1bHRzOiB7IHJlc3VsdDogTWFwPFBlcnNvbiwgRGF0ZT47IHByb2JhYmlsaXR5OiBudW1iZXI7IH1bXSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJ1bnM7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5zaW11bGF0ZU9uY2UoKTtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaChyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NTaW11bGF0aW9uUmVzdWx0cyhyZXN1bHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjb21wdXRlcyBhbiBhcnJheSByZXByZXNlbnRhdGlvbiBvZiB0aGUgc2ltdWxhdGlvbiByZXN1bHRzXG4gICAgICogQHBhcmFtIHJlc3VsdCAtc2ltdWxhdGlvbiByZXN1bHQgb2JqZWN0XG4gICAgICogQHBhcmFtIHJlc29sdXRpb24gLSBudW1iZXIgb2YgZGF0YXBvaW50cyB0byBzaG93IHBlciBkYXlcbiAgICAgKiBAcGFyYW0gbGFzdERhdGUgLSBsYXN0IGRhdGUgdG8gc2ltdWxhdGUgaW4gbXMgZnJvbSAxOTcwXG4gICAgICovXG4gICAgc3RhdGljIHRvQXJyYXkocmVzdWx0OiB7XG4gICAgICAgIGluaXRpYWxEYXRlOiBEYXRlO1xuICAgICAgICB0b3RhbEluZmVjdGlvblByb2JhYmlsaXR5OiBNYXA8UGVyc29uLCBudW1iZXI+O1xuICAgICAgICBpbmZlY3Rpb25UaW1lbGluZTogTWFwPFBlcnNvbiwge1xuICAgICAgICAgICAgZGF0ZTogRGF0ZTtcbiAgICAgICAgICAgIHA6IG51bWJlcjtcbiAgICAgICAgICAgIHBBY2M6IG51bWJlcjtcbiAgICAgICAgfVtdPjtcbiAgICB9LCByZXNvbHV0aW9uOiBudW1iZXIsIGxhc3REYXRlOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgcGVyc29uQXJyYXkgPSBuZXcgQXJyYXkoLi4ucmVzdWx0LmluZmVjdGlvblRpbWVsaW5lLmtleXMoKSk7XG4gICAgICAgIGNvbnN0IGxpc3Q6IHsgZGF0ZTogRGF0ZSwgdmFsdWVzOiBudW1iZXJbXSB9W10gPSBbXVxuICAgICAgICBjb25zdCBpbmRpY2VzID0gcGVyc29uQXJyYXkubWFwKChwZXJzb24pID0+IDApO1xuICAgICAgICBmb3IgKGxldCBkYXRlID0gcmVzdWx0LmluaXRpYWxEYXRlOyBkYXRlLmdldFRpbWUoKSA8IGxhc3REYXRlOyBkYXRlID0gbmV3IERhdGUoZGF0ZS5nZXRUaW1lKCkgKyByZXNvbHV0aW9uICogMTAwMCAqIDYwICogNjAgKiAyNCkpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlcyA9IG5ldyBBcnJheShwZXJzb25BcnJheS5sZW5ndGgpO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwZXJzb25BcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBlcnNvbiA9IHBlcnNvbkFycmF5W2ldO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBlcnNvblZhbHVlcyA9IHJlc3VsdC5pbmZlY3Rpb25UaW1lbGluZS5nZXQocGVyc29uKTtcbiAgICAgICAgICAgICAgICBsZXQgaW5kZXggPSBpbmRpY2VzW2ldO1xuICAgICAgICAgICAgICAgIHdoaWxlIChpbmRleCArIDEgPCBwZXJzb25WYWx1ZXMubGVuZ3RoICYmIHBlcnNvblZhbHVlc1tpbmRleCArIDFdICYmIHBlcnNvblZhbHVlc1tpbmRleCArIDFdLmRhdGUgPCBkYXRlKVxuICAgICAgICAgICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgICAgIGluZGljZXNbaV0gPSBpbmRleDtcbiAgICAgICAgICAgICAgICBuZXdWYWx1ZXNbaV0gPSBwZXJzb25WYWx1ZXNbaW5kZXhdLnBBY2M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsaXN0LnB1c2goeyBkYXRlOiBkYXRlLCB2YWx1ZXM6IG5ld1ZhbHVlcyB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG5cblxuXG4gICAgLyoqcmV0dXJucyB0aGUgcGVyc29ucyBhcyBhcnJheSB0byBiZSBhYmxlIHRvIHVzZSBBcnJheS5tYXAgZXRjICovXG4gICAgZ2V0IHBlcnNvbkFycmF5KCkge1xuICAgICAgICByZXR1cm4gbmV3IEFycmF5KC4uLnRoaXMucGVyc29ucyk7XG4gICAgfVxufSIsImltcG9ydCB7IFZpcnVzIH0gZnJvbSBcIi4vVmlydXNcIjtcbmltcG9ydCB7IFBlcnNvbiB9IGZyb20gXCIuL1BlcnNvblwiO1xuaW1wb3J0IHsgYWxnb3JpdGhtaWNDb25zdGFudHMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuZXhwb3J0IGNsYXNzIE9ic2VydmF0aW9uIHtcbiAgICBwZXJzb246IFBlcnNvbjtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge1BlcnNvbn0gcGVyc29uIFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHBlcnNvbjogUGVyc29uKSB7XG4gICAgICAgIHRoaXMucGVyc29uID0gcGVyc29uO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0RhdGU/fSBkYXRlT2ZJbmZlY3Rpb24gLSBkYXRlIGF0IHdoaWNoIGFuIGluZmVjdGlvbiBvY2N1cnMgb3IgbnVsbCB3aGVuIGl0IGRvZXMgbm90IG9jY3VyXG4gICAgICogQHJldHVybnMge251bWJlcn0gcHJvYmFiaWxpdHkgdGhhdCB0aGlzIG9ic2VydmF0aW9uIG9jY3VycyBnaXZlbiBhbiBpbnZlY3Rpb25cbiAgICAgKi9cbiAgICBnZXRQcm9iYWJpbGl0eShkYXRlT2ZJbmZlY3Rpb246IERhdGUgfCBudWxsKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbn1cbi8qKlxuICogQHR5cGVkZWYge09iamVjdH0gVGVzdE9wdGlvbnNcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzZW5zaXRpdml0eVxuICogQHByb3BlcnR5IHtudW1iZXJ9IHNwZWNpZmljaXR5XG4gKiBAcHJvcGVydHkge251bWJlcn0gdGltZVRcbiAqL1xuXG4vKipcbiAqIEBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgVGVzdCBleHRlbmRzIE9ic2VydmF0aW9uIHtcbiAgICBzdGFydE9ic2VydmFiaWxpdHk6IG51bWJlcjtcbiAgICBlbmRPYnNlcnZhYmlsaXR5OiBudW1iZXI7XG4gICAgcG9zaXRpdmU6IGJvb2xlYW47XG4gICAgc2Vuc2l0aXZpdHk6IG51bWJlcjtcbiAgICBzcGVjaWZpY2l0eTogbnVtYmVyO1xuICAgIGRhdGU6IERhdGU7XG4gICAgcmVsZXZhbnRUaW1lU3RhcnQ6IERhdGU7XG4gICAgcmVsZXZhbnRUaW1lRW5kOiBEYXRlO1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7UGVyc29ufSBwZXJzb25cbiAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgLSBkYXRlIG9mIHRoZSB0ZXN0XG4gICAgICogQHBhcmFtIHtib29sZWFufSBwb3NpdGl2ZSAtIHRydWUgaWYgdGhlIHJlc3VsdCBpcyBwb3NpdGl2ZVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHBlcnNvbjogUGVyc29uLCBkYXRlOiBEYXRlLCBwb3NpdGl2ZTogYm9vbGVhbiwgc2Vuc2l0aXZpdHkgPSAwLjk1LCBzcGVjaWZpY2l0eSA9IDAuOSwgc3RhcnRPYnNlcnZhYmlsaXR5ID0gMiwgZW5kT2JzZXJ2YWJpbGl0eSA9IDE0KSB7XG4gICAgICAgIHN1cGVyKHBlcnNvbik7XG4gICAgICAgIHRoaXMuc2V0RGF0ZShkYXRlKTtcbiAgICAgICAgdGhpcy5zdGFydE9ic2VydmFiaWxpdHkgPSBzdGFydE9ic2VydmFiaWxpdHk7XG4gICAgICAgIHRoaXMuZW5kT2JzZXJ2YWJpbGl0eSA9IGVuZE9ic2VydmFiaWxpdHk7XG4gICAgICAgIHRoaXMucG9zaXRpdmUgPSBwb3NpdGl2ZTtcbiAgICAgICAgdGhpcy5zZW5zaXRpdml0eSA9IHNlbnNpdGl2aXR5O1xuICAgICAgICB0aGlzLnNwZWNpZmljaXR5ID0gc3BlY2lmaWNpdHk7XG4gICAgfVxuICAgIHNldERhdGUoZGF0ZSA9IHRoaXMuZGF0ZSkge1xuICAgICAgICB0aGlzLmRhdGUgPSBkYXRlO1xuICAgICAgICB0aGlzLnJlbGV2YW50VGltZVN0YXJ0ID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgIHRoaXMucmVsZXZhbnRUaW1lU3RhcnQuc2V0RGF0ZShkYXRlLmdldERhdGUoKSAtIHRoaXMuZW5kT2JzZXJ2YWJpbGl0eSk7XG4gICAgICAgIHRoaXMucmVsZXZhbnRUaW1lRW5kID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgIHRoaXMucmVsZXZhbnRUaW1lRW5kLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgLSB0aGlzLnN0YXJ0T2JzZXJ2YWJpbGl0eSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RGF0ZT99IGRhdGVPZkluZmVjdGlvbiAtIGRhdGUgYXQgd2hpY2ggYW4gaW5mZWN0aW9uIG9jY3VycyBvciBudWxsIHdoZW4gaXQgZG9lcyBub3Qgb2NjdXJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBwcm9iYWJpbGl0eSB0aGF0IHRoaXMgb2JzZXJ2YXRpb24gb2NjdXJzIGdpdmVuIGFuIGludmVjdGlvblxuICAgICAqL1xuICAgIGdldFByb2JhYmlsaXR5KGRhdGVPZkluZmVjdGlvbjogRGF0ZSB8IG51bGwpOiBudW1iZXIge1xuICAgICAgICBpZiAoZGF0ZU9mSW5mZWN0aW9uICYmIGRhdGVPZkluZmVjdGlvbiA+IHRoaXMucmVsZXZhbnRUaW1lU3RhcnQgJiYgZGF0ZU9mSW5mZWN0aW9uIDwgdGhpcy5yZWxldmFudFRpbWVFbmQpIHtcbiAgICAgICAgICAgIC8vaW5mZWN0ZWRcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBvc2l0aXZlID8gdGhpcy5zZW5zaXRpdml0eSA6IDEgLSB0aGlzLnNwZWNpZmljaXR5O1xuICAgICAgICB9XG4gICAgICAgIC8vbm90IGluZmVjdGVkXG4gICAgICAgIHJldHVybiB0aGlzLnBvc2l0aXZlID8gKDEgLSB0aGlzLnNwZWNpZmljaXR5KSA6IHRoaXMuc2Vuc2l0aXZpdHk7XG4gICAgfVxufVxuLyoqXG4gKiBBIGxvZyBvZiB0aGUgc3ltcHRvbXMgYSBwZXJzb24gaGFzLiBOb3RlIHRoYXQgYSBsb2cgTVVTVCBjb250YWluIEFMTCBsb2dzIGFib3V0IG9uZSBwZXJzb24hXG4gKi9cbmV4cG9ydCBjbGFzcyBTeW1wdG9tTG9nIGV4dGVuZHMgT2JzZXJ2YXRpb24ge1xuICAgIGxvZzogTWFwPERhdGUsIG51bWJlcj47XG4gICAgZGF0ZXM6IERhdGVbXTtcbiAgICBtaW5EYXRlOiBEYXRlO1xuICAgIG1heERhdGU6IERhdGU7XG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtQZXJzb259IHBlcnNvblxuICAgICAqIEBwYXJhbSB7TWFwPERhdGUsbnVtYmVyPn0gbG9nIC0gbWFwcyBkYXRlcyBzdHJlbmd0aCBvZiBjb3ZpZC1zcGVjaWZpYyBzeW1wdG9tcyBvZiB0aGUgcGVyc29uIGF0IHRoYXQgZGF0ZS4gT05MWSBPTkUgUkVQT1JUIFBFUiBEQVkgQUxMT1dFRCEhIVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHBlcnNvbjogUGVyc29uLCBsb2c6IE1hcDxEYXRlLCBudW1iZXI+KSB7XG4gICAgICAgIHN1cGVyKHBlcnNvbik7XG4gICAgICAgIHRoaXMubG9nID0gbG9nO1xuICAgICAgICAvKipAdHlwZSB7RGF0ZVtdfSAqL1xuICAgICAgICB0aGlzLmRhdGVzID0gbmV3IEFycmF5KC4uLnRoaXMubG9nLmtleXMoKSk7XG4gICAgICAgIHRoaXMuZGF0ZXMuc29ydCgpO1xuICAgICAgICB0aGlzLm1pbkRhdGUgPSB0aGlzLmRhdGVzWzBdO1xuICAgICAgICB0aGlzLm1heERhdGUgPSB0aGlzLmRhdGVzW3RoaXMuZGF0ZXMubGVuZ3RoIC0gMV07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RGF0ZT99IGRhdGVPZkluZmVjdGlvbiAtIGRhdGUgYXQgd2hpY2ggYW4gaW5mZWN0aW9uIG9jY3VycyBvciBudWxsIHdoZW4gaXQgZG9lcyBub3Qgb2NjdXJcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBwcm9iYWJpbGl0eSB0aGF0IHRoaXMgb2JzZXJ2YXRpb24gb2NjdXJzIGdpdmVuIGFuIGludmVjdGlvblxuICAgICAqL1xuICAgIGdldFByb2JhYmlsaXR5KGRhdGVPZkluZmVjdGlvbjogRGF0ZSB8IG51bGwpOiBudW1iZXIge1xuICAgICAgICBsZXQgdmlydXNSZXBvcnRSYXRlID0gMDtcbiAgICAgICAgbGV0IGluZmVjdGlvbk1hdGNoaW5nID0gVmlydXMubm9TeW1wdG9tUHJvYmFiaWxpdHk7IC8vaG93IG11Y2ggdGhlIGluZmVjdGlvbiBtYXRjaGVzIHdpdGggdGhlIHJlcG9ydCBkYXlzXG4gICAgICAgIGlmIChkYXRlT2ZJbmZlY3Rpb24pIHtcbiAgICAgICAgICAgIC8vaW5mZWN0ZWRcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0UmVsZXZhbnREYXkgPSBuZXcgRGF0ZShkYXRlT2ZJbmZlY3Rpb24uZ2V0VGltZSgpICsgVmlydXMuaW5jdWJhdGlvblRpbWUgKiBhbGdvcml0aG1pY0NvbnN0YW50cy5kYXlUb01TKTtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RSZWxldmFudERheSA9IG5ldyBEYXRlKGRhdGVPZkluZmVjdGlvbi5nZXRUaW1lKCkgKyBWaXJ1cy5lbmRPZkluZmVjdGlvc25lc3MgKiBhbGdvcml0aG1pY0NvbnN0YW50cy5kYXlUb01TKTtcbiAgICAgICAgICAgIGNvbnN0IHJlbGV2YW50UmVwb3J0RGF5cyA9IHRoaXMuZGF0ZXMuZmlsdGVyKChkYXRlKSA9PiBmaXJzdFJlbGV2YW50RGF5IDw9IGRhdGUgJiYgZGF0ZSA8PSBsYXN0UmVsZXZhbnREYXkpOy8vcmVwb3J0cyBpbiBpbmZlY3Rpb24gdGltZWZyYW1lXG4gICAgICAgICAgICBmb3IgKGxldCByZWxldmFudFJlcG9ydERheSBvZiByZWxldmFudFJlcG9ydERheXMpIHtcbiAgICAgICAgICAgICAgICBpbmZlY3Rpb25NYXRjaGluZyA9IDEgLSAoMSAtIGluZmVjdGlvbk1hdGNoaW5nKSAqICgxIC0gdGhpcy5sb2cuZ2V0KHJlbGV2YW50UmVwb3J0RGF5KSAvIHJlbGV2YW50UmVwb3J0RGF5cy5sZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5mZWN0aW9uTWF0Y2hpbmcgPSByZWxldmFudFJlcG9ydERheXMubGVuZ3RoIC8gVmlydXMuZW5kT2ZJbmZlY3Rpb3NuZXNzO1xuICAgICAgICB9XG4gICAgICAgIC8vbm90IGluZmVjdGVkXG4gICAgICAgIGxldCBhdmVyYWdlSWxsbmVzcyA9IDA7XG4gICAgICAgIGZvciAobGV0IGRheUxvZyBvZiB0aGlzLmxvZykge1xuICAgICAgICAgICAgYXZlcmFnZUlsbG5lc3MgKz0gZGF5TG9nWzFdO1xuICAgICAgICB9XG4gICAgICAgIGF2ZXJhZ2VJbGxuZXNzIC89IHRoaXMubG9nLnNpemU7XG4gICAgICAgIHJldHVybiB2aXJ1c1JlcG9ydFJhdGUgKiBpbmZlY3Rpb25NYXRjaGluZyArICgxIC0gdmlydXNSZXBvcnRSYXRlKSAqICgwLjkgLSAwLjggKiBhdmVyYWdlSWxsbmVzcyk7IC8vMC45IGlmIG5vIHN5bXB0b21zLCAwLjEgaWYgdG90YWwgc3ltcHRvbXNcbiAgICB9XG59IiwiXG5cbmV4cG9ydCBjbGFzcyBWaXJ1cyB7XG5cblxuICAgIC8qKiBkYXlzIGFmdGVyIGluZmVjdGlvbiB3aGVuIHlvdSBzdGFydCBiZWluZyBpbmZlY3Rpb3VzICovXG4gICAgc3RhdGljIHN0YXJ0T2ZJbmZlY3Rpb3NuZXNzID0gMjtcblxuICAgIC8qKiBkYXlzIGFmdGVyIGluZmVjdGlvbiB3aGVuIHlvdSBzdG9wIGJlaW5nIGluZmVjdGlvdXMgKi9cbiAgICBzdGF0aWMgZW5kT2ZJbmZlY3Rpb3NuZXNzID0gMTA7XG4gICAgLyoqZGF5cyBhZnRlciBmaXJzdCBzeW1wdG9tcyBvY2N1ciAqL1xuICAgIHN0YXRpYyBpbmN1YmF0aW9uVGltZSA9IDUuNTtcbiAgICAvKipwcm9iYWJpbGl0eSBvZiBub3QgaGF2aW5nIGFueSBzeW1wdG9tcyB3aXRoIHRoZSB2aXJ1cyAqL1xuICAgIHN0YXRpYyBub1N5bXB0b21Qcm9iYWJpbGl0eSA9IDAuNTU7XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtQZXJzb25Mb2d9IGxvZyBcbiAgICAgKiBAcGFyYW0ge0RhdGV9IGRhdGUgLSBkYXRlIHRvIGdldCBwcm9iYWJpbGl0eSBmcm9tXG4gICAgICogQHJldHVybnMge251bWJlcn0gLSBwcm9iYWJpbGl0eSBvZiBiZWluZyBpbmZlY3RlZCBhbmQgYWJsZSB0byBzcHJlYWQgdGhlIHZpcnVzIGF0IHRoYXQgZGF0ZVxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRBY3V0ZUluZmVjdGlvblByb2JhYmlsaXR5KGxvZzogeyBnZXRJbmZlY3Rpb25Qcm9iYWJpbGl0eTogKGFyZzA6IERhdGUpID0+IG51bWJlcjsgfSwgZGF0ZTogRGF0ZSkge1xuICAgICAgICBjb25zdCBzdGFydEluZmVjdGlvblBlcmlvZCA9IG5ldyBEYXRlKGRhdGUpOyBzdGFydEluZmVjdGlvblBlcmlvZC5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gVmlydXMuZW5kT2ZJbmZlY3Rpb3NuZXNzKTtcbiAgICAgICAgY29uc3QgZW5kSW5mZWN0aW9uUGVyaW9kID0gbmV3IERhdGUoZGF0ZSk7IGVuZEluZmVjdGlvblBlcmlvZC5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gVmlydXMuc3RhcnRPZkluZmVjdGlvc25lc3MpO1xuICAgICAgICByZXR1cm4gbG9nLmdldEluZmVjdGlvblByb2JhYmlsaXR5KGVuZEluZmVjdGlvblBlcmlvZCkgLSBsb2cuZ2V0SW5mZWN0aW9uUHJvYmFiaWxpdHkoc3RhcnRJbmZlY3Rpb25QZXJpb2QpO1xuICAgIH1cbiAgICBzdGF0aWMgZ2V0UHJvYmFiaWxpdHlPZkluZmVjdGlvdXNuZXNzKGluZmVjdGlvbkRhdGU6ICBEYXRlLCBjdXJyZW50RGF0ZTogRGF0ZSkge1xuICAgICAgICBjb25zdCBzdGFydEluZmVjdGlvblBlcmlvZCA9IG5ldyBEYXRlKGluZmVjdGlvbkRhdGUpOyBzdGFydEluZmVjdGlvblBlcmlvZC5zZXREYXRlKGluZmVjdGlvbkRhdGUuZ2V0RGF0ZSgpICsgVmlydXMuc3RhcnRPZkluZmVjdGlvc25lc3MpO1xuICAgICAgICBjb25zdCBlbmRJbmZlY3Rpb25QZXJpb2QgPSBuZXcgRGF0ZShpbmZlY3Rpb25EYXRlKTsgZW5kSW5mZWN0aW9uUGVyaW9kLnNldERhdGUoaW5mZWN0aW9uRGF0ZS5nZXREYXRlKCkgKyBWaXJ1cy5lbmRPZkluZmVjdGlvc25lc3MpO1xuICAgICAgICByZXR1cm4gKHN0YXJ0SW5mZWN0aW9uUGVyaW9kIDwgY3VycmVudERhdGUgJiYgY3VycmVudERhdGUgPCBlbmRJbmZlY3Rpb25QZXJpb2QpID8gMSA6IDA7XG4gICAgfVxufVxuIiwiZXhwb3J0IGNvbnN0IGFsZ29yaXRobWljQ29uc3RhbnRzID0ge1xuICAgIGRlbHRhVDogMC4xLFxuICAgIGRheVRvTVM6IDEwMDAgKiA2MCAqIDYwICogMjRcbn07IiwiaW1wb3J0IHsgQ29udGFjdCB9IGZyb20gXCIuL0NvbnRhY3RcIjtcbmltcG9ydCB7IFBlcnNvbiB9IGZyb20gXCIuL1BlcnNvblwiO1xuaW1wb3J0IHsgU2ltdWxhdGlvbiB9IGZyb20gXCIuL1NpbXVsYXRpb25cIjtcbmltcG9ydCB7IE9ic2VydmF0aW9uLCBUZXN0IH0gZnJvbSBcIi4vVGVzdFwiO1xuXG5pbnRlcmZhY2UgVGVzdFNlcmlhbGl6YXRpb24ge1xuICAgIHR5cGU6IHN0cmluZztcbiAgICBwZXJzb246IHN0cmluZztcbiAgICBkYXRlOiBEYXRlO1xuICAgIHBvc2l0aXZlOiBib29sZWFuO1xuICAgIHNlbnNpdGl2aXR5OiBudW1iZXI7XG4gICAgc3BlY2lmaWNpdHk6IG51bWJlcjtcbiAgICByZWxldmFudFRpbWVTdGFydDogRGF0ZTtcbiAgICByZWxldmFudFRpbWVFbmQ6IERhdGU7XG59XG5leHBvcnQgY2xhc3MgU2ltdWxhdGlvblNlcmlhbGl6YXRpb24ge1xuICAgIHBlcnNvbnM6IHtcbiAgICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgICB1bnRyYWNrZWRGcmVxdWVuY3k6IG51bWJlcjtcbiAgICAgICAgdW50cmFja2VkSW50ZW5zaXR5OiBudW1iZXI7XG4gICAgICAgIGFjdGl2aXR5U3RyaW5nOiBzdHJpbmc7XG4gICAgfVtdO1xuICAgIGNvbnRhY3RzOiB7XG4gICAgICAgIGE6IHN0cmluZztcbiAgICAgICAgYjogc3RyaW5nO1xuICAgICAgICBkYXRlOiBEYXRlO1xuICAgICAgICBpbnRlbnNpdHk6IG51bWJlcjtcbiAgICB9W107XG4gICAgdGVzdHM6IChUZXN0U2VyaWFsaXphdGlvbiB8IHtcbiAgICAgICAgdHlwZTogc3RyaW5nXG4gICAgfSlbXTtcbiAgICBpbml0aWFsRGF0ZTogRGF0ZTtcbiAgICBsYXN0RGF0ZTogRGF0ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVGVzdChvYnNlcnZhdGlvbjogT2JzZXJ2YXRpb24pOiBvYnNlcnZhdGlvbiBpcyBUZXN0IHtcbiAgICByZXR1cm4gKG9ic2VydmF0aW9uIGFzIFRlc3QpLmRhdGUgIT09IG51bGw7XG59XG5leHBvcnQgZnVuY3Rpb24gaXNTaW11bGF0aW9uU2VyaWFsaXphdGlvbihzZXJpYWxpemF0aW9uOiBhbnkpOiBzZXJpYWxpemF0aW9uIGlzIFNpbXVsYXRpb25TZXJpYWxpemF0aW9uIHtcbiAgICBpZighc2VyaWFsaXphdGlvbi5wZXJzb25zKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgcCA9IChzZXJpYWxpemF0aW9uIGFzIFNpbXVsYXRpb25TZXJpYWxpemF0aW9uKS5wZXJzb25zWzBdO1xuICAgIGlmIChwKSB7XG4gICAgICAgIGlmIChwLmFjdGl2aXR5U3RyaW5nKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVTaW11bGF0aW9uKHNpbXVsYXRpb246IFNpbXVsYXRpb24pOiBTaW11bGF0aW9uU2VyaWFsaXphdGlvbiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcGVyc29uczogc2ltdWxhdGlvbi5wZXJzb25BcnJheS5tYXAoKHBlcnNvbikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuYW1lOiBwZXJzb24ubmFtZSxcbiAgICAgICAgICAgICAgICB1bnRyYWNrZWRGcmVxdWVuY3k6IHBlcnNvbi51bnRyYWNrZWRGcmVxdWVuY3ksXG4gICAgICAgICAgICAgICAgdW50cmFja2VkSW50ZW5zaXR5OiBwZXJzb24udW50cmFja2VkSW50ZW5zaXR5LFxuICAgICAgICAgICAgICAgIGFjdGl2aXR5U3RyaW5nOiBwZXJzb24uZXh0ZXJuYWxBY3Rpdml0eS50b1N0cmluZygpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgICBjb250YWN0czogc2ltdWxhdGlvbi5jb250YWN0cy5tYXAoY29udGFjdCA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGE6IGNvbnRhY3QuYS5uYW1lLFxuICAgICAgICAgICAgICAgIGI6IGNvbnRhY3QuYi5uYW1lLFxuICAgICAgICAgICAgICAgIGRhdGU6IGNvbnRhY3QuZGF0ZSxcbiAgICAgICAgICAgICAgICBpbnRlbnNpdHk6IGNvbnRhY3QuaW50ZW5zaXR5LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSksXG4gICAgICAgIHRlc3RzOiBzaW11bGF0aW9uLm9ic2VydmF0aW9ucy5tYXAoKG9ic2VydmF0aW9uKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNUZXN0KG9ic2VydmF0aW9uKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiVGVzdFwiLFxuICAgICAgICAgICAgICAgICAgICBwZXJzb246IG9ic2VydmF0aW9uLnBlcnNvbi5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBkYXRlOiBvYnNlcnZhdGlvbi5kYXRlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGl2ZTogb2JzZXJ2YXRpb24ucG9zaXRpdmUsXG4gICAgICAgICAgICAgICAgICAgIHNlbnNpdGl2aXR5OiBvYnNlcnZhdGlvbi5zZW5zaXRpdml0eSxcbiAgICAgICAgICAgICAgICAgICAgc3BlY2lmaWNpdHk6IG9ic2VydmF0aW9uLnNwZWNpZmljaXR5LFxuICAgICAgICAgICAgICAgICAgICByZWxldmFudFRpbWVTdGFydDogb2JzZXJ2YXRpb24ucmVsZXZhbnRUaW1lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJlbGV2YW50VGltZUVuZDogb2JzZXJ2YXRpb24ucmVsZXZhbnRUaW1lRW5kXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInVua25vd25cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIGluaXRpYWxEYXRlOiBzaW11bGF0aW9uLmluaXRpYWxEYXRlLFxuICAgICAgICBsYXN0RGF0ZTogc2ltdWxhdGlvbi5sYXN0RGF0ZVxuICAgIH1cbn1cbmZ1bmN0aW9uIGlzVGVzdFNlcmlhbGl6YXRpb24odGVzdDogVGVzdFNlcmlhbGl6YXRpb24gfCB7IHR5cGU6IHN0cmluZyB9KTogdGVzdCBpcyBUZXN0U2VyaWFsaXphdGlvbiB7XG4gICAgcmV0dXJuIHRlc3QudHlwZSA9PSBcIlRlc3RcIjtcbn1cbmV4cG9ydCBmdW5jdGlvbiByZXZpdmUoc2VyaWFsaXphdGlvbjogU2ltdWxhdGlvblNlcmlhbGl6YXRpb24pIHtcbiAgICBjb25zdCBzaW0gPSBuZXcgU2ltdWxhdGlvbihzZXJpYWxpemF0aW9uLmluaXRpYWxEYXRlKTtcbiAgICBzaW0ubGFzdERhdGUgPSBzZXJpYWxpemF0aW9uLmxhc3REYXRlO1xuICAgIGZvciAobGV0IHBlcnNvblNlcmlhbGl6YXRpb24gb2Ygc2VyaWFsaXphdGlvbi5wZXJzb25zKSB7XG4gICAgICAgIHNpbS5hZGRQZXJzb24obmV3IFBlcnNvbihcbiAgICAgICAgICAgIHBlcnNvblNlcmlhbGl6YXRpb24ubmFtZSxcbiAgICAgICAgICAgIHBlcnNvblNlcmlhbGl6YXRpb24udW50cmFja2VkRnJlcXVlbmN5LFxuICAgICAgICAgICAgcGVyc29uU2VyaWFsaXphdGlvbi51bnRyYWNrZWRJbnRlbnNpdHksXG4gICAgICAgICAgICBldmFsKHBlcnNvblNlcmlhbGl6YXRpb24uYWN0aXZpdHlTdHJpbmcpXG4gICAgICAgICkpXG4gICAgfVxuICAgIGNvbnN0IHBlcnNvbkZyb21OYW1lID0gKG5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICBmb3IgKGxldCBwZXJzb24gb2Ygc2ltLnBlcnNvbnMpXG4gICAgICAgICAgICBpZiAocGVyc29uLm5hbWUgPT0gbmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwZXJzb247XG4gICAgICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBmb3IgKGxldCBjIG9mIHNlcmlhbGl6YXRpb24uY29udGFjdHMpIHtcbiAgICAgICAgc2ltLmFkZENvbnRhY3QobmV3IENvbnRhY3QoXG4gICAgICAgICAgICBwZXJzb25Gcm9tTmFtZShjLmEpLFxuICAgICAgICAgICAgcGVyc29uRnJvbU5hbWUoYy5iKSwge1xuICAgICAgICAgICAgZGF0ZTogYy5kYXRlLFxuICAgICAgICAgICAgaW50ZW5zaXR5OiBjLmludGVuc2l0eVxuICAgICAgICB9XG4gICAgICAgICkpXG4gICAgfVxuICAgIGZvciAobGV0IG9iIG9mIHNlcmlhbGl6YXRpb24udGVzdHMpIHtcbiAgICAgICAgaWYgKGlzVGVzdFNlcmlhbGl6YXRpb24ob2IpKSB7XG4gICAgICAgICAgICBjb25zdCB0b0FkZCA9IG5ldyBUZXN0KFxuICAgICAgICAgICAgICAgIHBlcnNvbkZyb21OYW1lKG9iLnBlcnNvbiksXG4gICAgICAgICAgICAgICAgb2IuZGF0ZSxcbiAgICAgICAgICAgICAgICBvYi5wb3NpdGl2ZSxcbiAgICAgICAgICAgICAgICBvYi5zZW5zaXRpdml0eSxcbiAgICAgICAgICAgICAgICBvYi5zcGVjaWZpY2l0eVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRvQWRkLnJlbGV2YW50VGltZVN0YXJ0ID0gb2IucmVsZXZhbnRUaW1lU3RhcnQ7XG4gICAgICAgICAgICB0b0FkZC5yZWxldmFudFRpbWVFbmQgPSBvYi5yZWxldmFudFRpbWVFbmQ7XG4gICAgICAgICAgICBzaW0ub2JzZXJ2YXRpb25zLnB1c2godG9BZGQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzaW07XG59XG5cbmNvbnN0IGRhdGVLZXlzID0gbmV3IFNldChbXCJkYXRlXCIsIFwiaW5pdGlhbERhdGVcIiwgXCJsYXN0RGF0ZVwiLFwicmVsZXZhbnRUaW1lU3RhcnRcIixcInJlbGV2YW50VGltZUVuZFwiXSlcbmV4cG9ydCBmdW5jdGlvbiB0cnlQYXJzZVN0cmluZyhqc29uU3RyaW5nOiBzdHJpbmcpIHtcblxuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UoanNvblN0cmluZywgKGtleSwgdmFsKSA9PiB7XG4gICAgICAgIGlmIChkYXRlS2V5cy5oYXMoa2V5KSlcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZSh2YWwpO1xuICAgICAgICByZXR1cm4gdmFsXG4gICAgfSk7XG4gICAgaWYgKGlzU2ltdWxhdGlvblNlcmlhbGl6YXRpb24ocGFyc2VkKSkge1xuICAgICAgICBjb25zdCBzaW11bGF0aW9uID0gcmV2aXZlKHBhcnNlZCk7XG4gICAgICAgIHJldHVybiBzaW11bGF0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn0iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHRpZihfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdKSB7XG5cdFx0cmV0dXJuIF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0uZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlXG5fX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9zcmMvU2ltdWxhdGlvbldvcmtlci50c1wiKTtcbi8vIFRoaXMgZW50cnkgbW9kdWxlIHVzZWQgJ2V4cG9ydHMnIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbiJdLCJzb3VyY2VSb290IjoiIn0=