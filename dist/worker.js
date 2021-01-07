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
const graphicsUpdateInterval = 10000;
onmessage = (ev) => {
    if (simulationSerialization_1.isSimulationSerialization(ev.data)) {
        const simulation = simulationSerialization_1.revive(ev.data);
        const results = [];
        for (let i = 1; i < maxSimulationRuns; i++) {
            results.push(simulation.simulateOnce());
            if (i % graphicsUpdateInterval == 0) {
                const processed = simulation.processSimulationResults(results);
                const array = Simulation_1.Simulation.toArray(processed, 0.1, simulation.lastDate.getTime());
                const message = {
                    array: array,
                    persons: simulation.personArray
                };
                const ctx = self;
                ctx.postMessage(message);
            }
        }
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
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Person = void 0;
const constants_1 = __webpack_require__(/*! ./constants */ "./src/logic/constants.ts");
const defaultContactGenerator = (date, person) => ({
    date: new Date(date.getTime() + 2 * person.untrackedFrequency * Math.random() * constants_1.algorithmicConstants.dayToMS),
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
    return contact.person !== null;
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
exports.revive = exports.serializeSimulation = exports.isSimulationSerialization = exports.isTest = exports.SimulationSerialization = void 0;
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
            const toAdd = new Test_1.Test(personFromName(ob.person), ob.date, ob.positive, ob.sensitivity, ob.sensitivity);
            toAdd.relevantTimeStart = ob.relevantTimeStart;
            toAdd.relevantTimeEnd = ob.relevantTimeEnd;
            sim.observations.push(toAdd);
        }
    }
    return sim;
}
exports.revive = revive;


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9TaW11bGF0aW9uV29ya2VyLnRzIiwid2VicGFjazovL2Nvdmlkc2ltLy4vc3JjL2xvZ2ljL0NvbnRhY3QudHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvUGVyc29uLnRzIiwid2VicGFjazovL2Nvdmlkc2ltLy4vc3JjL2xvZ2ljL1NpbXVsYXRpb24udHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvVGVzdC50cyIsIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9sb2dpYy9WaXJ1cy50cyIsIndlYnBhY2s6Ly9jb3ZpZHNpbS8uL3NyYy9sb2dpYy9jb25zdGFudHMudHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vLi9zcmMvbG9naWMvc2ltdWxhdGlvblNlcmlhbGl6YXRpb24udHMiLCJ3ZWJwYWNrOi8vY292aWRzaW0vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vY292aWRzaW0vd2VicGFjay9zdGFydHVwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLGdHQUFnRDtBQUNoRCx1SUFBd0c7QUFFeEcsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUM7QUFDcEMsTUFBTSxzQkFBc0IsR0FBRyxLQUFLLENBQUM7QUFDckMsU0FBUyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUU7SUFDZixJQUFJLG1EQUF5QixDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNwQyxNQUFNLFVBQVUsR0FBRyxnQ0FBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxNQUFNLE9BQU8sR0FHUCxFQUFFLENBQUM7UUFDVCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDeEMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztZQUN4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QUFHLENBQUM7QUFDZixDQUFDO0FBMUNELHdCQTBDQzs7Ozs7OztVQ25JRDtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTs7VUFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7O1VDckJBO1VBQ0E7VUFDQTtVQUNBIiwiZmlsZSI6Indvcmtlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBlcnNvbiB9IGZyb20gXCIuL2xvZ2ljL1BlcnNvblwiO1xuaW1wb3J0IHsgU2ltdWxhdGlvbiB9IGZyb20gXCIuL2xvZ2ljL1NpbXVsYXRpb25cIjtcbmltcG9ydCB7IGlzU2ltdWxhdGlvblNlcmlhbGl6YXRpb24sIHNlcmlhbGl6ZVNpbXVsYXRpb24sIHJldml2ZSB9IGZyb20gXCIuL2xvZ2ljL3NpbXVsYXRpb25TZXJpYWxpemF0aW9uXCJcblxuY29uc3QgbWF4U2ltdWxhdGlvblJ1bnMgPSAxMDAwMDAwMDA7XG5jb25zdCBncmFwaGljc1VwZGF0ZUludGVydmFsID0gMTAwMDA7XG5vbm1lc3NhZ2UgPSAoZXYpID0+IHtcbiAgICBpZiAoaXNTaW11bGF0aW9uU2VyaWFsaXphdGlvbihldi5kYXRhKSkge1xuICAgICAgICBjb25zdCBzaW11bGF0aW9uID0gcmV2aXZlKGV2LmRhdGEpO1xuICAgICAgICBjb25zdCByZXN1bHRzOiB7XG4gICAgICAgICAgICBwcm9iYWJpbGl0eTogbnVtYmVyO1xuICAgICAgICAgICAgcmVzdWx0OiBNYXA8UGVyc29uLCBEYXRlPjtcbiAgICAgICAgfVtdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbWF4U2ltdWxhdGlvblJ1bnM7IGkrKykge1xuICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHNpbXVsYXRpb24uc2ltdWxhdGVPbmNlKCkpO1xuICAgICAgICAgICAgaWYgKGkgJSBncmFwaGljc1VwZGF0ZUludGVydmFsID09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9jZXNzZWQgPSBzaW11bGF0aW9uLnByb2Nlc3NTaW11bGF0aW9uUmVzdWx0cyhyZXN1bHRzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBhcnJheSA9IFNpbXVsYXRpb24udG9BcnJheShwcm9jZXNzZWQsIDAuMSwgc2ltdWxhdGlvbi5sYXN0RGF0ZS5nZXRUaW1lKCkpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICAgICAgICAgICAgICAgIGFycmF5OiBhcnJheSxcbiAgICAgICAgICAgICAgICAgICAgcGVyc29uczogc2ltdWxhdGlvbi5wZXJzb25BcnJheVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBjdHg6IFdvcmtlciA9IHNlbGYgYXMgYW55O1xuICAgICAgICAgICAgICAgIGN0eC5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0iLCJpbXBvcnQge1BlcnNvbn0gZnJvbSBcIi4vUGVyc29uXCI7XG5cbi8qKlxuICogQGNsYXNzXG4gKiBAcHJvcGVydHkge251bWJlcj99IGludGVuc2l0eSAtIFByb2JhYmlsaXR5IG9mIGluZmVjdGluZyB0aGUgb3RoZXIgb25lXG4gKiBAcHJvcGVydHkge0RhdGU/fSBkYXRlXG4gKi9cbmNsYXNzIENvbnRhY3RPcHRpb25ze1xuICAgIGludGVuc2l0eTpudW1iZXI9MC41O1xuICAgIGRhdGU6RGF0ZT1uZXcgRGF0ZSgpO1xufVxuXG4vKipcbiAqIEBjbGFzc1xuICogQGV4dGVuZHMge0NvbnRhY3RPcHRpb25zfVxuICovXG5leHBvcnQgY2xhc3MgQ29udGFjdCBleHRlbmRzIENvbnRhY3RPcHRpb25ze1xuICAgIGE6IFBlcnNvbjtcbiAgICBiOiBQZXJzb247XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtQZXJzb259IGEgXG4gICAgICogQHBhcmFtIHtQZXJzb259IGIgXG4gICAgICogQHBhcmFtIHtDb250YWN0T3B0aW9uc30gb3B0aW9ucyBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhOiBQZXJzb24sYjogUGVyc29uLG9wdGlvbnM6IENvbnRhY3RPcHRpb25zKXtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5hPWE7XG4gICAgICAgIHRoaXMuYj1iO1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMsb3B0aW9ucyk7XG4gICAgfVxuICAgIHByb2Nlc3MoKXtcbiAgICAgICAgXG4gICAgfVxufSIsImltcG9ydCB7IGFsZ29yaXRobWljQ29uc3RhbnRzIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbi8qKlxuICogQHR5cGVkZWYgeyhkYXRlOkRhdGUpPT57Y29udGFjdERlbnNpdHk6bnVtYmVyLGNvbnRhY3RJbnRlbnNpdHk6bnVtYmVyfX0gdW50cmFja2VkQWN0aXZpdHlcbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIFVudHJhY2tlZENvbnRhY3QgIHtcbiAgICAvKiotZGF0ZSBhdCB3aGljaCB0aGUgY29udGFjdCB0YWtlcyBwbGFjZSAqL1xuICAgIGRhdGU6IERhdGU7XG4gICAgLyoqcGVyc29uIGhhdmluZyBhbiB1bnRyYWNrZWQgY29udGFjdCAqL1xuICAgIHBlcnNvbjogUGVyc29uO1xuICAgIC8qKnByb2JhYmlsaXR5IG9mIHRyYW5zbWlzc2lvbiBpZiBvbmUgb2YgdGhlIHBlcnNvbnMgaXMgaW5mZWN0ZWQgYW5kIHRoZSBvdGhlciBvbmUgbm90ICovXG4gICAgaW50ZW5zaXR5OiBudW1iZXI7XG4gICAgLyoqd2hldGhlciBvdGhlciBwZXJzb24gaXMgaW5mZWN0ZWQgYWN1dGVseSAqL1xuICAgIGFjdXRlSW5mZWN0ZWQ6IGJvb2xlYW47XG4gICAgLyoqd2hldGhlciB0aGUgb3RoZXIgcGVyc29uIHdhcyBpbmZlY3RlZCBhdCBhbnkgcG9pbnQgaW4gdGltZSAqL1xuICAgIGV2ZXJJbmZlY3RlZDogYm9vbGVhbjtcbn1cbi8qKiBnZW5lcmF0ZXMgbmV4dCB1bnRyYWNrZWQgY29udGFjdCBzdGFydGluZyBhdCBhIGdpdmVuIGRhdGUgKi9cbmV4cG9ydCB0eXBlIHVudHJhY2tlZENvbnRhY3RHZW5lcmF0b3I9KGRhdGU6RGF0ZSxwZXJzb246UGVyc29uKT0+VW50cmFja2VkQ29udGFjdDtcblxuY29uc3QgZGVmYXVsdENvbnRhY3RHZW5lcmF0b3I6dW50cmFja2VkQ29udGFjdEdlbmVyYXRvciA9IChkYXRlOiBEYXRlLCBwZXJzb246IFBlcnNvbikgPT4gKHtcbiAgICBkYXRlOiBuZXcgRGF0ZShkYXRlLmdldFRpbWUoKSArIDIgKiBwZXJzb24udW50cmFja2VkRnJlcXVlbmN5ICogTWF0aC5yYW5kb20oKSAqIGFsZ29yaXRobWljQ29uc3RhbnRzLmRheVRvTVMpLFxuICAgIGFjdXRlSW5mZWN0ZWQ6IDAuMDAxID4gTWF0aC5yYW5kb20oKSxcbiAgICBldmVySW5mZWN0ZWQ6IDAuMDEgPiBNYXRoLnJhbmRvbSgpLFxuICAgIGludGVuc2l0eTogMiAqIE1hdGgucmFuZG9tKCkgKiBwZXJzb24udW50cmFja2VkSW50ZW5zaXR5LFxuICAgIHBlcnNvbjogcGVyc29uXG59KTtcbi8qKlxuICogQ2xhc3MgcmVwcmVzZW50aW5nIHBlcnNvbnMgaW4gdGhlIHJlYWwgd29ybGQuXG4gKi9cbmV4cG9ydCBjbGFzcyBQZXJzb24ge1xuICAgIG5hbWU6IHN0cmluZztcbiAgICB1bnRyYWNrZWRGcmVxdWVuY3k6IG51bWJlcjtcbiAgICB1bnRyYWNrZWRJbnRlbnNpdHk6IG51bWJlcjtcbiAgICBleHRlcm5hbEFjdGl2aXR5OiB1bnRyYWNrZWRDb250YWN0R2VuZXJhdG9yO1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAgICogQHBhcmFtIHt1bnRyYWNrZWRDb250YWN0R2VuZXJhdG9yfSBleHRlcm5hbEFjdGl2aXR5IC0gZ2VuZXJhdGVzIG5leHQgY29udGFjdCBvZiBwZXJzb24gc3RhcnRpbmcgYXQgZ2l2ZW4gZGF0ZVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgdW50cmFja2VkRnJlcXVlbmN5ID0gMSwgdW50cmFja2VkSW50ZW5zaXR5ID0gMC4xLCBleHRlcm5hbEFjdGl2aXR5OnVudHJhY2tlZENvbnRhY3RHZW5lcmF0b3IgPSBkZWZhdWx0Q29udGFjdEdlbmVyYXRvcikge1xuICAgICAgICB0aGlzLmV4dGVybmFsQWN0aXZpdHkgPSBleHRlcm5hbEFjdGl2aXR5O1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLnVudHJhY2tlZEZyZXF1ZW5jeSA9IHVudHJhY2tlZEZyZXF1ZW5jeTtcbiAgICAgICAgdGhpcy51bnRyYWNrZWRJbnRlbnNpdHkgPSB1bnRyYWNrZWRJbnRlbnNpdHk7XG4gICAgfVxufSIsImltcG9ydCB7IFBlcnNvbiwgVW50cmFja2VkQ29udGFjdCB9IGZyb20gXCIuL1BlcnNvblwiO1xuaW1wb3J0IHsgQ29udGFjdCB9IGZyb20gXCIuL0NvbnRhY3RcIjtcbmltcG9ydCB7IFZpcnVzIH0gZnJvbSBcIi4vVmlydXNcIjtcbmltcG9ydCB7IE9ic2VydmF0aW9uLCBUZXN0IH0gZnJvbSBcIi4vVGVzdFwiO1xuaW1wb3J0IHsgYWxnb3JpdGhtaWNDb25zdGFudHMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzVW50cmFja2VkKGNvbnRhY3Q6IFVudHJhY2tlZENvbnRhY3QgfCBDb250YWN0KTogY29udGFjdCBpcyBVbnRyYWNrZWRDb250YWN0IHtcbiAgICByZXR1cm4gKGNvbnRhY3QgYXMgVW50cmFja2VkQ29udGFjdCkucGVyc29uICE9PSBudWxsO1xufVxuLyoqXG4gKiBTaW11bGF0aW9uIG9mIGFuIGluZmVjdGlvbi4gUHJvdmlkZXMgdGhlIGZ1bmN0aW9uYWxpdHkgdG8gc2ltdWxhdGUgdGhlIHBsb3QgbWFueSB0aW1lcyB0byBhcHByb3hpbWF0ZSBwcm9iYWJpbGl0aWVzIGF0IGdpdmVuIHRlc3QgcmVzdWx0c1xuICovXG5leHBvcnQgY2xhc3MgU2ltdWxhdGlvbiB7XG4gICAgb2JzZXJ2YXRpb25zOiBPYnNlcnZhdGlvbltdO1xuICAgIGluaXRpYWxEYXRlOiBEYXRlO1xuICAgIGxhc3REYXRlOiBEYXRlO1xuICAgIHBlcnNvbnM6IFNldDxQZXJzb24+O1xuICAgIGNvbnRhY3RzOiBDb250YWN0W107XG4gICAgcGVyc29uVG9Jbml0aWFsSW5mZWN0aW9uRGF0ZTogTWFwPFBlcnNvbiwgKCkgPT4gRGF0ZT47XG4gICAgY29uc3RydWN0b3IoaW5pdGlhbERhdGU6IERhdGUgPSBuZXcgRGF0ZSgpLCBvYnNlcnZhdGlvbnM6IE9ic2VydmF0aW9uW10gPSBbXSkge1xuICAgICAgICB0aGlzLm9ic2VydmF0aW9ucyA9IG9ic2VydmF0aW9ucztcbiAgICAgICAgdGhpcy5pbml0aWFsRGF0ZSA9IGluaXRpYWxEYXRlO1xuICAgICAgICB0aGlzLmxhc3REYXRlID0gaW5pdGlhbERhdGU7XG4gICAgICAgIC8qKkB0eXBlIHtTZXQ8UGVyc29uPn0qL1xuICAgICAgICB0aGlzLnBlcnNvbnMgPSBuZXcgU2V0KCk7XG4gICAgICAgIC8qKiBAdHlwZSB7Q29udGFjdFtdfSAqL1xuICAgICAgICB0aGlzLmNvbnRhY3RzID0gW107XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBc3NpZ25zIGEgZnVuY3Rpb24gdG8gZWFjaCBwZXJzb24gd2hpY2ggZ2VuZXJhdGVzIGFuIGluaXRpYWwgaW5mZWN0aW9uIGRhdGUgKG9yIG51bGwgaWYgbm8gaW5mZWN0aW9uIGhhcHBlbmVkKVxuICAgICAgICAgKiBAdHlwZSB7TWFwPFBlcnNvbiwoKT0+RGF0ZT99XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnBlcnNvblRvSW5pdGlhbEluZmVjdGlvbkRhdGUgPSBuZXcgTWFwKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7UGVyc29ufSBwZXJzb24gXG4gICAgICogQHBhcmFtIHsoKT0+RGF0ZT99IGRhdGVHZW5lcmF0b3IgLWZ1bmN0aW9uIHdoaWNoIGdlbmVyYXRlcyBhbiBpbml0aWFsIGluZmVjdGlvbiBkYXRlIChvciBudWxsIGlmIG5vIGluZmVjdGlvbiBoYXBwZW5lZClcbiAgICAgKi9cbiAgICBzZXRJbmZlY3Rpb25EYXRlRnVuY3Rpb24ocGVyc29uOiBQZXJzb24sIGRhdGVHZW5lcmF0b3I6ICgpID0+IERhdGUgfCBudWxsKSB7XG4gICAgICAgIHRoaXMucGVyc29uVG9Jbml0aWFsSW5mZWN0aW9uRGF0ZS5zZXQocGVyc29uLCBkYXRlR2VuZXJhdG9yKTtcbiAgICB9XG4gICAgLyoqQHBhcmFtIHtQZXJzb259IHRvQWRkICovXG4gICAgYWRkUGVyc29uKHRvQWRkOiBQZXJzb24pIHtcbiAgICAgICAgdGhpcy5wZXJzb25zLmFkZCh0b0FkZCk7XG5cbiAgICAgICAgdGhpcy5wZXJzb25Ub0luaXRpYWxJbmZlY3Rpb25EYXRlLnNldCh0b0FkZCwgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKHRoaXMuaW5pdGlhbERhdGUuZ2V0VGltZSgpIC0gTWF0aC5yYW5kb20oKSAqIDEwMCAqIGFsZ29yaXRobWljQ29uc3RhbnRzLmRheVRvTVMpOy8vcmFuZG9tIGRheSBpbiB0aGUgbGFzdCAxMDAgZGF5c1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKiogQHBhcmFtIHtDb250YWN0fSB0b0FkZCAtIGNvbnRhY3QgdG8gYmUgYWRkZWQgdG8gdGhlIHByb2Nlc3Npb24gbGlzdCAqL1xuICAgIGFkZENvbnRhY3QodG9BZGQ6IENvbnRhY3QpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmNvbnRhY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodG9BZGQuZGF0ZS5nZXRUaW1lKCkgPCB0aGlzLmNvbnRhY3RzW2ldLmRhdGUuZ2V0VGltZSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb250YWN0cy5zcGxpY2UoaSwgMCwgdG9BZGQpO1xuICAgICAgICAgICAgICAgIHRoaXMucGVyc29ucy5hZGQodG9BZGQuYSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wZXJzb25zLmFkZCh0b0FkZC5iKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb250YWN0cy5wdXNoKHRvQWRkKTtcbiAgICAgICAgdGhpcy5hZGRQZXJzb24odG9BZGQuYSk7XG4gICAgICAgIHRoaXMuYWRkUGVyc29uKHRvQWRkLmIpO1xuICAgICAgICBpZiAodGhpcy5sYXN0RGF0ZSA8IHRvQWRkLmRhdGUpXG4gICAgICAgICAgICB0aGlzLmxhc3REYXRlID0gdG9BZGQuZGF0ZTtcbiAgICB9XG4gICAgLyoqb3JkZXIgY29udGFjdHMgdG8gYXZvaWQgYW55IGVycm9ycyAqL1xuICAgIHJlZnJlc2hDb250YWN0cygpIHtcbiAgICAgICAgdGhpcy5jb250YWN0cy5zb3J0KChhLCBiKSA9PiBhLmRhdGUuZ2V0VGltZSgpIC0gYi5kYXRlLmdldFRpbWUoKSk7XG4gICAgICAgIGlmICh0aGlzLmNvbnRhY3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMubGFzdERhdGUgPSB0aGlzLmNvbnRhY3RzW3RoaXMuY29udGFjdHMubGVuZ3RoIC0gMV0uZGF0ZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBvIG9mIHRoaXMub2JzZXJ2YXRpb25zKSB7XG4gICAgICAgICAgICBpZiAobyBpbnN0YW5jZW9mIFRlc3QgJiYgby5kYXRlICYmIG8uZGF0ZSA+IHRoaXMubGFzdERhdGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxhc3REYXRlID0gby5kYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmNvbnRhY3RzLmxlbmd0aCA+IDAgJiYgdGhpcy5pbml0aWFsRGF0ZSA+IHRoaXMuY29udGFjdHNbMF0uZGF0ZSkge1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsRGF0ZSA9IHRoaXMuY29udGFjdHNbMF0uZGF0ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzaW11bGF0ZU9uY2UoKSB7XG4gICAgICAgIHRoaXMucmVmcmVzaENvbnRhY3RzKCk7XG4gICAgICAgIGNvbnN0IGxhc3REYXRlVG9TaW11bGF0ZSA9IHRoaXMubGFzdERhdGU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAdHlwZSB7TWFwPFBlcnNvbixEYXRlPn1cbiAgICAgICAgICovXG4gICAgICAgIGNvbnN0IHJlc3VsdDogTWFwPFBlcnNvbiwgRGF0ZT4gPSBuZXcgTWFwKCk7XG4gICAgICAgIC8qKkB0eXBlIHtVbnRyYWNrZWRDb250YWN0fENvbnRhY3QpW119ICovXG4gICAgICAgIGNvbnN0IGV2ZW50czogKFVudHJhY2tlZENvbnRhY3QgfCBDb250YWN0KVtdID0gbmV3IEFycmF5KC4uLnRoaXMuY29udGFjdHMpO1xuICAgICAgICAvKipAdHlwZSB7KGNvbnRhY3Q6aW1wb3J0KFwiLi9QZXJzb24uanNcIikuVW50cmFja2VkQ29udGFjdCk9PnZvaWR9ICovXG4gICAgICAgIGNvbnN0IGFkZFVudHJhY2tlZENvbnRhY3Q6IChjb250YWN0OiBVbnRyYWNrZWRDb250YWN0KSA9PiB2b2lkID0gKGNvbnN0YWN0KTogdm9pZCA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRlID0gY29uc3RhY3QuZGF0ZTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgaW4gZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50c1tpXS5kYXRlID4gZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBldmVudHMuc3BsaWNlKE51bWJlci5wYXJzZUludChpKSwgMCwgY29uc3RhY3QpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXZlbnRzLnB1c2goY29uc3RhY3QpO1xuICAgICAgICB9O1xuICAgICAgICBmb3IgKGxldCBwZXJzb24gb2YgdGhpcy5wZXJzb25zKSB7XG4gICAgICAgICAgICBjb25zdCBpbml0aWFsRGF0ZSA9IHRoaXMucGVyc29uVG9Jbml0aWFsSW5mZWN0aW9uRGF0ZS5nZXQocGVyc29uKSgpO1xuICAgICAgICAgICAgcmVzdWx0LnNldChwZXJzb24sIGluaXRpYWxEYXRlKTtcbiAgICAgICAgICAgIGZvciAobGV0IGNvbnRhY3QgPSBwZXJzb24uZXh0ZXJuYWxBY3Rpdml0eSh0aGlzLmluaXRpYWxEYXRlLCBwZXJzb24pOyBjb250YWN0LmRhdGUgPCBsYXN0RGF0ZVRvU2ltdWxhdGU7IGNvbnRhY3QgPSBwZXJzb24uZXh0ZXJuYWxBY3Rpdml0eShjb250YWN0LmRhdGUsIHBlcnNvbikpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29udGFjdC5hY3V0ZUluZmVjdGVkKVxuICAgICAgICAgICAgICAgICAgICBhZGRVbnRyYWNrZWRDb250YWN0KGNvbnRhY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGNvbnRhY3Qgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICBpZiAoaXNVbnRyYWNrZWQoY29udGFjdCkpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnRhY3QgaXMgdW50cmFja2VkLiBUaGlzIGlzIG9ubHkgdHJpZ2dlcmVkIGlmIHRoZSBvdGhlciBwZXJzb24gaXMgaW5mZWN0ZWRcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5nZXQoY29udGFjdC5wZXJzb24pICYmIE1hdGgucmFuZG9tKCkgPCBjb250YWN0LmludGVuc2l0eSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0KGNvbnRhY3QucGVyc29uLCBjb250YWN0LmRhdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vY29udGFjdCBpcyB0cmFja2VkXG4gICAgICAgICAgICBjb25zdCBhRGF0ZSA9IHJlc3VsdC5nZXQoY29udGFjdC5hKTtcbiAgICAgICAgICAgIGNvbnN0IGJEYXRlID0gcmVzdWx0LmdldChjb250YWN0LmIpO1xuICAgICAgICAgICAgLy8gaWYgYm90aCBvciBub25lIGlzIGluZmVjdGVkIG5vdGhpbmcgaGFwcGVuc1xuICAgICAgICAgICAgaWYgKGFEYXRlICYmIGJEYXRlIHx8ICFhRGF0ZSAmJiAhYkRhdGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBpZiAoYURhdGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9iYWJpbGl0eU9mSW5mZWN0aW9uID0gY29udGFjdC5pbnRlbnNpdHkgKiBWaXJ1cy5nZXRQcm9iYWJpbGl0eU9mSW5mZWN0aW91c25lc3MoYURhdGUsIGNvbnRhY3QuZGF0ZSk7XG4gICAgICAgICAgICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPCBwcm9iYWJpbGl0eU9mSW5mZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXQoY29udGFjdC5iLCBjb250YWN0LmRhdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChiRGF0ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2JhYmlsaXR5T2ZJbmZlY3Rpb24gPSBjb250YWN0LmludGVuc2l0eSAqIFZpcnVzLmdldFByb2JhYmlsaXR5T2ZJbmZlY3Rpb3VzbmVzcyhiRGF0ZSwgY29udGFjdC5kYXRlKTtcbiAgICAgICAgICAgICAgICBpZiAocHJvYmFiaWxpdHlPZkluZmVjdGlvbiA8PSAwKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA8IHByb2JhYmlsaXR5T2ZJbmZlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldChjb250YWN0LmEsIGNvbnRhY3QuZGF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxldCBwcm9iYWJpbGl0eSA9IDE7XG4gICAgICAgIGZvciAobGV0IG9ic2VydmF0aW9uIG9mIHRoaXMub2JzZXJ2YXRpb25zKSB7XG4gICAgICAgICAgICBwcm9iYWJpbGl0eSAqPSBvYnNlcnZhdGlvbi5nZXRQcm9iYWJpbGl0eShyZXN1bHQuZ2V0KG9ic2VydmF0aW9uLnBlcnNvbikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwcm9iYWJpbGl0eTogcHJvYmFiaWxpdHksXG4gICAgICAgICAgICByZXN1bHQ6IHJlc3VsdFxuICAgICAgICB9O1xuICAgIH1cbiAgICBwcm9jZXNzU2ltdWxhdGlvblJlc3VsdHMocmVzdWx0czogeyByZXN1bHQ6IE1hcDxQZXJzb24sIERhdGU+OyBwcm9iYWJpbGl0eTogbnVtYmVyOyB9W10pIHtcblxuICAgICAgICBsZXQgcHJvYmFiaWxpdHlTdW0gPSAwO1xuICAgICAgICBmb3IgKGxldCByZXN1bHQgb2YgcmVzdWx0cylcbiAgICAgICAgICAgIHByb2JhYmlsaXR5U3VtICs9IHJlc3VsdC5wcm9iYWJpbGl0eTtcbiAgICAgICAgLyoqQHR5cGUge01hcDxQZXJzb24sbnVtYmVyPn0gKi9cbiAgICAgICAgY29uc3QgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eTogTWFwPFBlcnNvbiwgbnVtYmVyPiA9IG5ldyBNYXAoKTtcbiAgICAgICAgZm9yIChsZXQgcGVyc29uIG9mIHRoaXMucGVyc29ucykge1xuICAgICAgICAgICAgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eS5zZXQocGVyc29uLCAwKTtcbiAgICAgICAgfVxuICAgICAgICAvKipAdHlwZSB7TWFwPFBlcnNvbix7ZGF0ZTpEYXRlLHA6bnVtYmVyLCBwQWNjOm51bWJlcj99W10+fSAqL1xuICAgICAgICBjb25zdCBpbmZlY3Rpb25EYXRlczogTWFwPFBlcnNvbiwgeyBkYXRlOiBEYXRlOyBwOiBudW1iZXI7IHBBY2M6IG51bWJlciB8IG51bGw7IH1bXT4gPSBuZXcgTWFwKCk7XG4gICAgICAgIGZvciAobGV0IHBlcnNvbiBvZiB0aGlzLnBlcnNvbnMpXG4gICAgICAgICAgICBpbmZlY3Rpb25EYXRlcy5zZXQocGVyc29uLCBbXSk7XG4gICAgICAgIGZvciAobGV0IHJlc3VsdCBvZiByZXN1bHRzKSB7XG4gICAgICAgICAgICBjb25zdCByZWFsUHJvYiA9IHJlc3VsdC5wcm9iYWJpbGl0eSAvIHByb2JhYmlsaXR5U3VtO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBwZXJzb24gb2YgdGhpcy5wZXJzb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5yZXN1bHQuZ2V0KHBlcnNvbikpXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsSW5mZWN0aW9uUHJvYmFiaWxpdHkuc2V0KHBlcnNvbiwgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eS5nZXQocGVyc29uKSArIHJlYWxQcm9iKTtcbiAgICAgICAgICAgICAgICBpbmZlY3Rpb25EYXRlcy5nZXQocGVyc29uKS5wdXNoKHsgZGF0ZTogcmVzdWx0LnJlc3VsdC5nZXQocGVyc29uKSwgcDogcmVhbFByb2IsIHBBY2M6IG51bGwgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgcGVyc29uIG9mIHRoaXMucGVyc29ucykge1xuICAgICAgICAgICAgY29uc3QgaW5mZWN0aW9uRGF0ZXNQZXJzb24gPSBpbmZlY3Rpb25EYXRlcy5nZXQocGVyc29uKTtcbiAgICAgICAgICAgIGluZmVjdGlvbkRhdGVzUGVyc29uLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWEuZGF0ZSAmJiAhYi5kYXRlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgICBpZiAoIWEuZGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgaWYgKCFiLmRhdGUpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5kYXRlLmdldFRpbWUoKSAtIGIuZGF0ZS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGxldCBhY2N1bXVsYXRlZFByb2IgPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgZGF0ZSBvZiBpbmZlY3Rpb25EYXRlc1BlcnNvbikge1xuICAgICAgICAgICAgICAgIGFjY3VtdWxhdGVkUHJvYiArPSBkYXRlLnA7XG4gICAgICAgICAgICAgICAgZGF0ZS5wQWNjID0gYWNjdW11bGF0ZWRQcm9iO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGluaXRpYWxEYXRlOiB0aGlzLmluaXRpYWxEYXRlLFxuICAgICAgICAgICAgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eTogdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eSxcbiAgICAgICAgICAgIGluZmVjdGlvblRpbWVsaW5lOiBpbmZlY3Rpb25EYXRlc1xuICAgICAgICB9O1xuICAgIH1cbiAgICBzaW11bGF0ZShydW5zOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0czogeyByZXN1bHQ6IE1hcDxQZXJzb24sIERhdGU+OyBwcm9iYWJpbGl0eTogbnVtYmVyOyB9W10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBydW5zOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuc2ltdWxhdGVPbmNlKCk7XG4gICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzU2ltdWxhdGlvblJlc3VsdHMocmVzdWx0cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogY29tcHV0ZXMgYW4gYXJyYXkgcmVwcmVzZW50YXRpb24gb2YgdGhlIHNpbXVsYXRpb24gcmVzdWx0c1xuICAgICAqIEBwYXJhbSByZXN1bHQgLXNpbXVsYXRpb24gcmVzdWx0IG9iamVjdFxuICAgICAqIEBwYXJhbSByZXNvbHV0aW9uIC0gbnVtYmVyIG9mIGRhdGFwb2ludHMgdG8gc2hvdyBwZXIgZGF5XG4gICAgICogQHBhcmFtIGxhc3REYXRlIC0gbGFzdCBkYXRlIHRvIHNpbXVsYXRlIGluIG1zIGZyb20gMTk3MFxuICAgICAqL1xuICAgIHN0YXRpYyB0b0FycmF5KHJlc3VsdDoge1xuICAgICAgICBpbml0aWFsRGF0ZTogRGF0ZTtcbiAgICAgICAgdG90YWxJbmZlY3Rpb25Qcm9iYWJpbGl0eTogTWFwPFBlcnNvbiwgbnVtYmVyPjtcbiAgICAgICAgaW5mZWN0aW9uVGltZWxpbmU6IE1hcDxQZXJzb24sIHtcbiAgICAgICAgICAgIGRhdGU6IERhdGU7XG4gICAgICAgICAgICBwOiBudW1iZXI7XG4gICAgICAgICAgICBwQWNjOiBudW1iZXI7XG4gICAgICAgIH1bXT47XG4gICAgfSwgcmVzb2x1dGlvbjogbnVtYmVyLCBsYXN0RGF0ZTogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IHBlcnNvbkFycmF5ID0gbmV3IEFycmF5KC4uLnJlc3VsdC5pbmZlY3Rpb25UaW1lbGluZS5rZXlzKCkpO1xuICAgICAgICBjb25zdCBsaXN0OiB7IGRhdGU6IERhdGUsIHZhbHVlczogbnVtYmVyW10gfVtdID0gW11cbiAgICAgICAgY29uc3QgaW5kaWNlcyA9IHBlcnNvbkFycmF5Lm1hcCgocGVyc29uKSA9PiAwKTtcbiAgICAgICAgZm9yIChsZXQgZGF0ZSA9IHJlc3VsdC5pbml0aWFsRGF0ZTsgZGF0ZS5nZXRUaW1lKCkgPCBsYXN0RGF0ZTsgZGF0ZSA9IG5ldyBEYXRlKGRhdGUuZ2V0VGltZSgpICsgcmVzb2x1dGlvbiAqIDEwMDAgKiA2MCAqIDYwICogMjQpKSB7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZXMgPSBuZXcgQXJyYXkocGVyc29uQXJyYXkubGVuZ3RoKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGVyc29uQXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwZXJzb24gPSBwZXJzb25BcnJheVtpXTtcbiAgICAgICAgICAgICAgICBjb25zdCBwZXJzb25WYWx1ZXMgPSByZXN1bHQuaW5mZWN0aW9uVGltZWxpbmUuZ2V0KHBlcnNvbik7XG4gICAgICAgICAgICAgICAgbGV0IGluZGV4ID0gaW5kaWNlc1tpXTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaW5kZXggKyAxIDwgcGVyc29uVmFsdWVzLmxlbmd0aCAmJiBwZXJzb25WYWx1ZXNbaW5kZXggKyAxXSAmJiBwZXJzb25WYWx1ZXNbaW5kZXggKyAxXS5kYXRlIDwgZGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgICAgICBpbmRpY2VzW2ldID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgbmV3VmFsdWVzW2ldID0gcGVyc29uVmFsdWVzW2luZGV4XS5wQWNjO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGlzdC5wdXNoKHsgZGF0ZTogZGF0ZSwgdmFsdWVzOiBuZXdWYWx1ZXMgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuXG5cblxuICAgIC8qKnJldHVybnMgdGhlIHBlcnNvbnMgYXMgYXJyYXkgdG8gYmUgYWJsZSB0byB1c2UgQXJyYXkubWFwIGV0YyAqL1xuICAgIGdldCBwZXJzb25BcnJheSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBBcnJheSguLi50aGlzLnBlcnNvbnMpO1xuICAgIH1cbn0iLCJpbXBvcnQgeyBWaXJ1cyB9IGZyb20gXCIuL1ZpcnVzXCI7XG5pbXBvcnQgeyBQZXJzb24gfSBmcm9tIFwiLi9QZXJzb25cIjtcbmltcG9ydCB7IGFsZ29yaXRobWljQ29uc3RhbnRzIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbmV4cG9ydCBjbGFzcyBPYnNlcnZhdGlvbiB7XG4gICAgcGVyc29uOiBQZXJzb247XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtQZXJzb259IHBlcnNvbiBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihwZXJzb246IFBlcnNvbikge1xuICAgICAgICB0aGlzLnBlcnNvbiA9IHBlcnNvbjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtEYXRlP30gZGF0ZU9mSW5mZWN0aW9uIC0gZGF0ZSBhdCB3aGljaCBhbiBpbmZlY3Rpb24gb2NjdXJzIG9yIG51bGwgd2hlbiBpdCBkb2VzIG5vdCBvY2N1clxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IHByb2JhYmlsaXR5IHRoYXQgdGhpcyBvYnNlcnZhdGlvbiBvY2N1cnMgZ2l2ZW4gYW4gaW52ZWN0aW9uXG4gICAgICovXG4gICAgZ2V0UHJvYmFiaWxpdHkoZGF0ZU9mSW5mZWN0aW9uOiBEYXRlIHwgbnVsbCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG59XG4vKipcbiAqIEB0eXBlZGVmIHtPYmplY3R9IFRlc3RPcHRpb25zXG4gKiBAcHJvcGVydHkge251bWJlcn0gc2Vuc2l0aXZpdHlcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzcGVjaWZpY2l0eVxuICogQHByb3BlcnR5IHtudW1iZXJ9IHRpbWVUXG4gKi9cblxuLyoqXG4gKiBAY2xhc3NcbiAqL1xuZXhwb3J0IGNsYXNzIFRlc3QgZXh0ZW5kcyBPYnNlcnZhdGlvbiB7XG4gICAgc3RhcnRPYnNlcnZhYmlsaXR5OiBudW1iZXI7XG4gICAgZW5kT2JzZXJ2YWJpbGl0eTogbnVtYmVyO1xuICAgIHBvc2l0aXZlOiBib29sZWFuO1xuICAgIHNlbnNpdGl2aXR5OiBudW1iZXI7XG4gICAgc3BlY2lmaWNpdHk6IG51bWJlcjtcbiAgICBkYXRlOiBEYXRlO1xuICAgIHJlbGV2YW50VGltZVN0YXJ0OiBEYXRlO1xuICAgIHJlbGV2YW50VGltZUVuZDogRGF0ZTtcbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge1BlcnNvbn0gcGVyc29uXG4gICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIC0gZGF0ZSBvZiB0aGUgdGVzdFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcG9zaXRpdmUgLSB0cnVlIGlmIHRoZSByZXN1bHQgaXMgcG9zaXRpdmVcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihwZXJzb246IFBlcnNvbiwgZGF0ZTogRGF0ZSwgcG9zaXRpdmU6IGJvb2xlYW4sIHNlbnNpdGl2aXR5ID0gMC45NSwgc3BlY2lmaWNpdHkgPSAwLjksIHN0YXJ0T2JzZXJ2YWJpbGl0eSA9IDIsIGVuZE9ic2VydmFiaWxpdHkgPSAxNCkge1xuICAgICAgICBzdXBlcihwZXJzb24pO1xuICAgICAgICB0aGlzLnNldERhdGUoZGF0ZSk7XG4gICAgICAgIHRoaXMuc3RhcnRPYnNlcnZhYmlsaXR5ID0gc3RhcnRPYnNlcnZhYmlsaXR5O1xuICAgICAgICB0aGlzLmVuZE9ic2VydmFiaWxpdHkgPSBlbmRPYnNlcnZhYmlsaXR5O1xuICAgICAgICB0aGlzLnBvc2l0aXZlID0gcG9zaXRpdmU7XG4gICAgICAgIHRoaXMuc2Vuc2l0aXZpdHkgPSBzZW5zaXRpdml0eTtcbiAgICAgICAgdGhpcy5zcGVjaWZpY2l0eSA9IHNwZWNpZmljaXR5O1xuICAgIH1cbiAgICBzZXREYXRlKGRhdGUgPSB0aGlzLmRhdGUpIHtcbiAgICAgICAgdGhpcy5kYXRlID0gZGF0ZTtcbiAgICAgICAgdGhpcy5yZWxldmFudFRpbWVTdGFydCA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICB0aGlzLnJlbGV2YW50VGltZVN0YXJ0LnNldERhdGUoZGF0ZS5nZXREYXRlKCkgLSB0aGlzLmVuZE9ic2VydmFiaWxpdHkpO1xuICAgICAgICB0aGlzLnJlbGV2YW50VGltZUVuZCA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICB0aGlzLnJlbGV2YW50VGltZUVuZC5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gdGhpcy5zdGFydE9ic2VydmFiaWxpdHkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0RhdGU/fSBkYXRlT2ZJbmZlY3Rpb24gLSBkYXRlIGF0IHdoaWNoIGFuIGluZmVjdGlvbiBvY2N1cnMgb3IgbnVsbCB3aGVuIGl0IGRvZXMgbm90IG9jY3VyXG4gICAgICogQHJldHVybnMge251bWJlcn0gcHJvYmFiaWxpdHkgdGhhdCB0aGlzIG9ic2VydmF0aW9uIG9jY3VycyBnaXZlbiBhbiBpbnZlY3Rpb25cbiAgICAgKi9cbiAgICBnZXRQcm9iYWJpbGl0eShkYXRlT2ZJbmZlY3Rpb246IERhdGUgfCBudWxsKTogbnVtYmVyIHtcbiAgICAgICAgaWYgKGRhdGVPZkluZmVjdGlvbiAmJiBkYXRlT2ZJbmZlY3Rpb24gPiB0aGlzLnJlbGV2YW50VGltZVN0YXJ0ICYmIGRhdGVPZkluZmVjdGlvbiA8IHRoaXMucmVsZXZhbnRUaW1lRW5kKSB7XG4gICAgICAgICAgICAvL2luZmVjdGVkXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wb3NpdGl2ZSA/IHRoaXMuc2Vuc2l0aXZpdHkgOiAxIC0gdGhpcy5zcGVjaWZpY2l0eTtcbiAgICAgICAgfVxuICAgICAgICAvL25vdCBpbmZlY3RlZFxuICAgICAgICByZXR1cm4gdGhpcy5wb3NpdGl2ZSA/ICgxIC0gdGhpcy5zcGVjaWZpY2l0eSkgOiB0aGlzLnNlbnNpdGl2aXR5O1xuICAgIH1cbn1cbi8qKlxuICogQSBsb2cgb2YgdGhlIHN5bXB0b21zIGEgcGVyc29uIGhhcy4gTm90ZSB0aGF0IGEgbG9nIE1VU1QgY29udGFpbiBBTEwgbG9ncyBhYm91dCBvbmUgcGVyc29uIVxuICovXG5leHBvcnQgY2xhc3MgU3ltcHRvbUxvZyBleHRlbmRzIE9ic2VydmF0aW9uIHtcbiAgICBsb2c6IE1hcDxEYXRlLCBudW1iZXI+O1xuICAgIGRhdGVzOiBEYXRlW107XG4gICAgbWluRGF0ZTogRGF0ZTtcbiAgICBtYXhEYXRlOiBEYXRlO1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7UGVyc29ufSBwZXJzb25cbiAgICAgKiBAcGFyYW0ge01hcDxEYXRlLG51bWJlcj59IGxvZyAtIG1hcHMgZGF0ZXMgc3RyZW5ndGggb2YgY292aWQtc3BlY2lmaWMgc3ltcHRvbXMgb2YgdGhlIHBlcnNvbiBhdCB0aGF0IGRhdGUuIE9OTFkgT05FIFJFUE9SVCBQRVIgREFZIEFMTE9XRUQhISFcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihwZXJzb246IFBlcnNvbiwgbG9nOiBNYXA8RGF0ZSwgbnVtYmVyPikge1xuICAgICAgICBzdXBlcihwZXJzb24pO1xuICAgICAgICB0aGlzLmxvZyA9IGxvZztcbiAgICAgICAgLyoqQHR5cGUge0RhdGVbXX0gKi9cbiAgICAgICAgdGhpcy5kYXRlcyA9IG5ldyBBcnJheSguLi50aGlzLmxvZy5rZXlzKCkpO1xuICAgICAgICB0aGlzLmRhdGVzLnNvcnQoKTtcbiAgICAgICAgdGhpcy5taW5EYXRlID0gdGhpcy5kYXRlc1swXTtcbiAgICAgICAgdGhpcy5tYXhEYXRlID0gdGhpcy5kYXRlc1t0aGlzLmRhdGVzLmxlbmd0aCAtIDFdO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0RhdGU/fSBkYXRlT2ZJbmZlY3Rpb24gLSBkYXRlIGF0IHdoaWNoIGFuIGluZmVjdGlvbiBvY2N1cnMgb3IgbnVsbCB3aGVuIGl0IGRvZXMgbm90IG9jY3VyXG4gICAgICogQHJldHVybnMge251bWJlcn0gcHJvYmFiaWxpdHkgdGhhdCB0aGlzIG9ic2VydmF0aW9uIG9jY3VycyBnaXZlbiBhbiBpbnZlY3Rpb25cbiAgICAgKi9cbiAgICBnZXRQcm9iYWJpbGl0eShkYXRlT2ZJbmZlY3Rpb246IERhdGUgfCBudWxsKTogbnVtYmVyIHtcbiAgICAgICAgbGV0IHZpcnVzUmVwb3J0UmF0ZSA9IDA7XG4gICAgICAgIGxldCBpbmZlY3Rpb25NYXRjaGluZyA9IFZpcnVzLm5vU3ltcHRvbVByb2JhYmlsaXR5OyAvL2hvdyBtdWNoIHRoZSBpbmZlY3Rpb24gbWF0Y2hlcyB3aXRoIHRoZSByZXBvcnQgZGF5c1xuICAgICAgICBpZiAoZGF0ZU9mSW5mZWN0aW9uKSB7XG4gICAgICAgICAgICAvL2luZmVjdGVkXG4gICAgICAgICAgICBjb25zdCBmaXJzdFJlbGV2YW50RGF5ID0gbmV3IERhdGUoZGF0ZU9mSW5mZWN0aW9uLmdldFRpbWUoKSArIFZpcnVzLmluY3ViYXRpb25UaW1lICogYWxnb3JpdGhtaWNDb25zdGFudHMuZGF5VG9NUyk7XG4gICAgICAgICAgICBjb25zdCBsYXN0UmVsZXZhbnREYXkgPSBuZXcgRGF0ZShkYXRlT2ZJbmZlY3Rpb24uZ2V0VGltZSgpICsgVmlydXMuZW5kT2ZJbmZlY3Rpb3NuZXNzICogYWxnb3JpdGhtaWNDb25zdGFudHMuZGF5VG9NUyk7XG4gICAgICAgICAgICBjb25zdCByZWxldmFudFJlcG9ydERheXMgPSB0aGlzLmRhdGVzLmZpbHRlcigoZGF0ZSkgPT4gZmlyc3RSZWxldmFudERheSA8PSBkYXRlICYmIGRhdGUgPD0gbGFzdFJlbGV2YW50RGF5KTsvL3JlcG9ydHMgaW4gaW5mZWN0aW9uIHRpbWVmcmFtZVxuICAgICAgICAgICAgZm9yIChsZXQgcmVsZXZhbnRSZXBvcnREYXkgb2YgcmVsZXZhbnRSZXBvcnREYXlzKSB7XG4gICAgICAgICAgICAgICAgaW5mZWN0aW9uTWF0Y2hpbmcgPSAxIC0gKDEgLSBpbmZlY3Rpb25NYXRjaGluZykgKiAoMSAtIHRoaXMubG9nLmdldChyZWxldmFudFJlcG9ydERheSkgLyByZWxldmFudFJlcG9ydERheXMubGVuZ3RoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGluZmVjdGlvbk1hdGNoaW5nID0gcmVsZXZhbnRSZXBvcnREYXlzLmxlbmd0aCAvIFZpcnVzLmVuZE9mSW5mZWN0aW9zbmVzcztcbiAgICAgICAgfVxuICAgICAgICAvL25vdCBpbmZlY3RlZFxuICAgICAgICBsZXQgYXZlcmFnZUlsbG5lc3MgPSAwO1xuICAgICAgICBmb3IgKGxldCBkYXlMb2cgb2YgdGhpcy5sb2cpIHtcbiAgICAgICAgICAgIGF2ZXJhZ2VJbGxuZXNzICs9IGRheUxvZ1sxXTtcbiAgICAgICAgfVxuICAgICAgICBhdmVyYWdlSWxsbmVzcyAvPSB0aGlzLmxvZy5zaXplO1xuICAgICAgICByZXR1cm4gdmlydXNSZXBvcnRSYXRlICogaW5mZWN0aW9uTWF0Y2hpbmcgKyAoMSAtIHZpcnVzUmVwb3J0UmF0ZSkgKiAoMC45IC0gMC44ICogYXZlcmFnZUlsbG5lc3MpOyAvLzAuOSBpZiBubyBzeW1wdG9tcywgMC4xIGlmIHRvdGFsIHN5bXB0b21zXG4gICAgfVxufSIsIlxuXG5leHBvcnQgY2xhc3MgVmlydXMge1xuXG5cbiAgICAvKiogZGF5cyBhZnRlciBpbmZlY3Rpb24gd2hlbiB5b3Ugc3RhcnQgYmVpbmcgaW5mZWN0aW91cyAqL1xuICAgIHN0YXRpYyBzdGFydE9mSW5mZWN0aW9zbmVzcyA9IDI7XG5cbiAgICAvKiogZGF5cyBhZnRlciBpbmZlY3Rpb24gd2hlbiB5b3Ugc3RvcCBiZWluZyBpbmZlY3Rpb3VzICovXG4gICAgc3RhdGljIGVuZE9mSW5mZWN0aW9zbmVzcyA9IDEwO1xuICAgIC8qKmRheXMgYWZ0ZXIgZmlyc3Qgc3ltcHRvbXMgb2NjdXIgKi9cbiAgICBzdGF0aWMgaW5jdWJhdGlvblRpbWUgPSA1LjU7XG4gICAgLyoqcHJvYmFiaWxpdHkgb2Ygbm90IGhhdmluZyBhbnkgc3ltcHRvbXMgd2l0aCB0aGUgdmlydXMgKi9cbiAgICBzdGF0aWMgbm9TeW1wdG9tUHJvYmFiaWxpdHkgPSAwLjU1O1xuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7UGVyc29uTG9nfSBsb2cgXG4gICAgICogQHBhcmFtIHtEYXRlfSBkYXRlIC0gZGF0ZSB0byBnZXQgcHJvYmFiaWxpdHkgZnJvbVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IC0gcHJvYmFiaWxpdHkgb2YgYmVpbmcgaW5mZWN0ZWQgYW5kIGFibGUgdG8gc3ByZWFkIHRoZSB2aXJ1cyBhdCB0aGF0IGRhdGVcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0QWN1dGVJbmZlY3Rpb25Qcm9iYWJpbGl0eShsb2c6IHsgZ2V0SW5mZWN0aW9uUHJvYmFiaWxpdHk6IChhcmcwOiBEYXRlKSA9PiBudW1iZXI7IH0sIGRhdGU6IERhdGUpIHtcbiAgICAgICAgY29uc3Qgc3RhcnRJbmZlY3Rpb25QZXJpb2QgPSBuZXcgRGF0ZShkYXRlKTsgc3RhcnRJbmZlY3Rpb25QZXJpb2Quc2V0RGF0ZShkYXRlLmdldERhdGUoKSAtIFZpcnVzLmVuZE9mSW5mZWN0aW9zbmVzcyk7XG4gICAgICAgIGNvbnN0IGVuZEluZmVjdGlvblBlcmlvZCA9IG5ldyBEYXRlKGRhdGUpOyBlbmRJbmZlY3Rpb25QZXJpb2Quc2V0RGF0ZShkYXRlLmdldERhdGUoKSAtIFZpcnVzLnN0YXJ0T2ZJbmZlY3Rpb3NuZXNzKTtcbiAgICAgICAgcmV0dXJuIGxvZy5nZXRJbmZlY3Rpb25Qcm9iYWJpbGl0eShlbmRJbmZlY3Rpb25QZXJpb2QpIC0gbG9nLmdldEluZmVjdGlvblByb2JhYmlsaXR5KHN0YXJ0SW5mZWN0aW9uUGVyaW9kKTtcbiAgICB9XG4gICAgc3RhdGljIGdldFByb2JhYmlsaXR5T2ZJbmZlY3Rpb3VzbmVzcyhpbmZlY3Rpb25EYXRlOiAgRGF0ZSwgY3VycmVudERhdGU6IERhdGUpIHtcbiAgICAgICAgY29uc3Qgc3RhcnRJbmZlY3Rpb25QZXJpb2QgPSBuZXcgRGF0ZShpbmZlY3Rpb25EYXRlKTsgc3RhcnRJbmZlY3Rpb25QZXJpb2Quc2V0RGF0ZShpbmZlY3Rpb25EYXRlLmdldERhdGUoKSArIFZpcnVzLnN0YXJ0T2ZJbmZlY3Rpb3NuZXNzKTtcbiAgICAgICAgY29uc3QgZW5kSW5mZWN0aW9uUGVyaW9kID0gbmV3IERhdGUoaW5mZWN0aW9uRGF0ZSk7IGVuZEluZmVjdGlvblBlcmlvZC5zZXREYXRlKGluZmVjdGlvbkRhdGUuZ2V0RGF0ZSgpICsgVmlydXMuZW5kT2ZJbmZlY3Rpb3NuZXNzKTtcbiAgICAgICAgcmV0dXJuIChzdGFydEluZmVjdGlvblBlcmlvZCA8IGN1cnJlbnREYXRlICYmIGN1cnJlbnREYXRlIDwgZW5kSW5mZWN0aW9uUGVyaW9kKSA/IDEgOiAwO1xuICAgIH1cbn1cbiIsImV4cG9ydCBjb25zdCBhbGdvcml0aG1pY0NvbnN0YW50cyA9IHtcbiAgICBkZWx0YVQ6IDAuMSxcbiAgICBkYXlUb01TOiAxMDAwICogNjAgKiA2MCAqIDI0XG59OyIsImltcG9ydCB7IENvbnRhY3QgfSBmcm9tIFwiLi9Db250YWN0XCI7XG5pbXBvcnQgeyBQZXJzb24gfSBmcm9tIFwiLi9QZXJzb25cIjtcbmltcG9ydCB7IFNpbXVsYXRpb24gfSBmcm9tIFwiLi9TaW11bGF0aW9uXCI7XG5pbXBvcnQgeyBPYnNlcnZhdGlvbiwgVGVzdCB9IGZyb20gXCIuL1Rlc3RcIjtcblxuaW50ZXJmYWNlIFRlc3RTZXJpYWxpemF0aW9uIHtcbiAgICB0eXBlOiBzdHJpbmc7XG4gICAgcGVyc29uOiBzdHJpbmc7XG4gICAgZGF0ZTogRGF0ZTtcbiAgICBwb3NpdGl2ZTogYm9vbGVhbjtcbiAgICBzZW5zaXRpdml0eTogbnVtYmVyO1xuICAgIHNwZWNpZmljaXR5OiBudW1iZXI7XG4gICAgcmVsZXZhbnRUaW1lU3RhcnQ6IERhdGU7XG4gICAgcmVsZXZhbnRUaW1lRW5kOiBEYXRlO1xufVxuZXhwb3J0IGNsYXNzIFNpbXVsYXRpb25TZXJpYWxpemF0aW9uIHtcbiAgICBwZXJzb25zOiB7XG4gICAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgICAgdW50cmFja2VkRnJlcXVlbmN5OiBudW1iZXI7XG4gICAgICAgIHVudHJhY2tlZEludGVuc2l0eTogbnVtYmVyO1xuICAgICAgICBhY3Rpdml0eVN0cmluZzogc3RyaW5nO1xuICAgIH1bXTtcbiAgICBjb250YWN0czoge1xuICAgICAgICBhOiBzdHJpbmc7XG4gICAgICAgIGI6IHN0cmluZztcbiAgICAgICAgZGF0ZTogRGF0ZTtcbiAgICAgICAgaW50ZW5zaXR5OiBudW1iZXI7XG4gICAgfVtdO1xuICAgIHRlc3RzOiAoVGVzdFNlcmlhbGl6YXRpb24gfCB7XG4gICAgICAgIHR5cGU6IHN0cmluZ1xuICAgIH0pW107XG4gICAgaW5pdGlhbERhdGU6IERhdGU7XG4gICAgbGFzdERhdGU6IERhdGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1Rlc3Qob2JzZXJ2YXRpb246IE9ic2VydmF0aW9uKTogb2JzZXJ2YXRpb24gaXMgVGVzdCB7XG4gICAgcmV0dXJuIChvYnNlcnZhdGlvbiBhcyBUZXN0KS5kYXRlICE9PSBudWxsO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlzU2ltdWxhdGlvblNlcmlhbGl6YXRpb24oc2VyaWFsaXphdGlvbjogYW55KTogc2VyaWFsaXphdGlvbiBpcyBTaW11bGF0aW9uU2VyaWFsaXphdGlvbiB7XG4gICAgY29uc3QgcCA9IChzZXJpYWxpemF0aW9uIGFzIFNpbXVsYXRpb25TZXJpYWxpemF0aW9uKS5wZXJzb25zWzBdO1xuICAgIGlmIChwKSB7XG4gICAgICAgIGlmIChwLmFjdGl2aXR5U3RyaW5nKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVTaW11bGF0aW9uKHNpbXVsYXRpb246IFNpbXVsYXRpb24pOiBTaW11bGF0aW9uU2VyaWFsaXphdGlvbiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcGVyc29uczogc2ltdWxhdGlvbi5wZXJzb25BcnJheS5tYXAoKHBlcnNvbikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuYW1lOiBwZXJzb24ubmFtZSxcbiAgICAgICAgICAgICAgICB1bnRyYWNrZWRGcmVxdWVuY3k6IHBlcnNvbi51bnRyYWNrZWRGcmVxdWVuY3ksXG4gICAgICAgICAgICAgICAgdW50cmFja2VkSW50ZW5zaXR5OiBwZXJzb24udW50cmFja2VkSW50ZW5zaXR5LFxuICAgICAgICAgICAgICAgIGFjdGl2aXR5U3RyaW5nOiBwZXJzb24uZXh0ZXJuYWxBY3Rpdml0eS50b1N0cmluZygpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgICBjb250YWN0czogc2ltdWxhdGlvbi5jb250YWN0cy5tYXAoY29udGFjdCA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGE6IGNvbnRhY3QuYS5uYW1lLFxuICAgICAgICAgICAgICAgIGI6IGNvbnRhY3QuYi5uYW1lLFxuICAgICAgICAgICAgICAgIGRhdGU6IGNvbnRhY3QuZGF0ZSxcbiAgICAgICAgICAgICAgICBpbnRlbnNpdHk6IGNvbnRhY3QuaW50ZW5zaXR5LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSksXG4gICAgICAgIHRlc3RzOiBzaW11bGF0aW9uLm9ic2VydmF0aW9ucy5tYXAoKG9ic2VydmF0aW9uKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNUZXN0KG9ic2VydmF0aW9uKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiVGVzdFwiLFxuICAgICAgICAgICAgICAgICAgICBwZXJzb246IG9ic2VydmF0aW9uLnBlcnNvbi5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBkYXRlOiBvYnNlcnZhdGlvbi5kYXRlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGl2ZTogb2JzZXJ2YXRpb24ucG9zaXRpdmUsXG4gICAgICAgICAgICAgICAgICAgIHNlbnNpdGl2aXR5OiBvYnNlcnZhdGlvbi5zZW5zaXRpdml0eSxcbiAgICAgICAgICAgICAgICAgICAgc3BlY2lmaWNpdHk6IG9ic2VydmF0aW9uLnNwZWNpZmljaXR5LFxuICAgICAgICAgICAgICAgICAgICByZWxldmFudFRpbWVTdGFydDogb2JzZXJ2YXRpb24ucmVsZXZhbnRUaW1lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJlbGV2YW50VGltZUVuZDogb2JzZXJ2YXRpb24ucmVsZXZhbnRUaW1lRW5kXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInVua25vd25cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIGluaXRpYWxEYXRlOiBzaW11bGF0aW9uLmluaXRpYWxEYXRlLFxuICAgICAgICBsYXN0RGF0ZTogc2ltdWxhdGlvbi5sYXN0RGF0ZVxuICAgIH1cbn1cbmZ1bmN0aW9uIGlzVGVzdFNlcmlhbGl6YXRpb24odGVzdDogVGVzdFNlcmlhbGl6YXRpb24gfCB7IHR5cGU6IHN0cmluZyB9KTogdGVzdCBpcyBUZXN0U2VyaWFsaXphdGlvbiB7XG4gICAgcmV0dXJuIHRlc3QudHlwZSA9PSBcIlRlc3RcIjtcbn1cbmV4cG9ydCBmdW5jdGlvbiByZXZpdmUoc2VyaWFsaXphdGlvbjogU2ltdWxhdGlvblNlcmlhbGl6YXRpb24pIHtcbiAgICBjb25zdCBzaW0gPSBuZXcgU2ltdWxhdGlvbihzZXJpYWxpemF0aW9uLmluaXRpYWxEYXRlKTtcbiAgICBzaW0ubGFzdERhdGUgPSBzZXJpYWxpemF0aW9uLmxhc3REYXRlO1xuICAgIGZvciAobGV0IHBlcnNvblNlcmlhbGl6YXRpb24gb2Ygc2VyaWFsaXphdGlvbi5wZXJzb25zKSB7XG4gICAgICAgIHNpbS5hZGRQZXJzb24obmV3IFBlcnNvbihcbiAgICAgICAgICAgIHBlcnNvblNlcmlhbGl6YXRpb24ubmFtZSxcbiAgICAgICAgICAgIHBlcnNvblNlcmlhbGl6YXRpb24udW50cmFja2VkRnJlcXVlbmN5LFxuICAgICAgICAgICAgcGVyc29uU2VyaWFsaXphdGlvbi51bnRyYWNrZWRJbnRlbnNpdHksXG4gICAgICAgICAgICBldmFsKHBlcnNvblNlcmlhbGl6YXRpb24uYWN0aXZpdHlTdHJpbmcpXG4gICAgICAgICkpXG4gICAgfVxuICAgIGNvbnN0IHBlcnNvbkZyb21OYW1lID0gKG5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICBmb3IgKGxldCBwZXJzb24gb2Ygc2ltLnBlcnNvbnMpXG4gICAgICAgICAgICBpZiAocGVyc29uLm5hbWUgPT0gbmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwZXJzb247XG4gICAgICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBmb3IgKGxldCBjIG9mIHNlcmlhbGl6YXRpb24uY29udGFjdHMpIHtcbiAgICAgICAgc2ltLmFkZENvbnRhY3QobmV3IENvbnRhY3QoXG4gICAgICAgICAgICBwZXJzb25Gcm9tTmFtZShjLmEpLFxuICAgICAgICAgICAgcGVyc29uRnJvbU5hbWUoYy5iKSwge1xuICAgICAgICAgICAgZGF0ZTogYy5kYXRlLFxuICAgICAgICAgICAgaW50ZW5zaXR5OiBjLmludGVuc2l0eVxuICAgICAgICB9XG4gICAgICAgICkpXG4gICAgfVxuICAgIGZvciAobGV0IG9iIG9mIHNlcmlhbGl6YXRpb24udGVzdHMpIHtcbiAgICAgICAgaWYgKGlzVGVzdFNlcmlhbGl6YXRpb24ob2IpKSB7XG4gICAgICAgICAgICBjb25zdCB0b0FkZCA9IG5ldyBUZXN0KFxuICAgICAgICAgICAgICAgIHBlcnNvbkZyb21OYW1lKG9iLnBlcnNvbiksXG4gICAgICAgICAgICAgICAgb2IuZGF0ZSxcbiAgICAgICAgICAgICAgICBvYi5wb3NpdGl2ZSxcbiAgICAgICAgICAgICAgICBvYi5zZW5zaXRpdml0eSxcbiAgICAgICAgICAgICAgICBvYi5zZW5zaXRpdml0eVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRvQWRkLnJlbGV2YW50VGltZVN0YXJ0ID0gb2IucmVsZXZhbnRUaW1lU3RhcnQ7XG4gICAgICAgICAgICB0b0FkZC5yZWxldmFudFRpbWVFbmQgPSBvYi5yZWxldmFudFRpbWVFbmQ7XG4gICAgICAgICAgICBzaW0ub2JzZXJ2YXRpb25zLnB1c2godG9BZGQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzaW07XG59IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0aWYoX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSkge1xuXHRcdHJldHVybiBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZVxuX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vc3JjL1NpbXVsYXRpb25Xb3JrZXIudHNcIik7XG4vLyBUaGlzIGVudHJ5IG1vZHVsZSB1c2VkICdleHBvcnRzJyBzbyBpdCBjYW4ndCBiZSBpbmxpbmVkXG4iXSwic291cmNlUm9vdCI6IiJ9