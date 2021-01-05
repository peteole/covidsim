import { Person } from "./Person";
import { Contact } from "./Contact.js";
import { Virus } from "./Virus.js";
import { Observation } from "./Test.js";
import { algorithmicConstants } from "./constants.js";

/**
 * Simulation of an infection. Provides the functionality to simulate the plot many times to approximate probabilities at given test results
 */
export class Simulation {
    /**
     * 
     * @param {Date} initialDate 
     * @param {Observation[]} observations 
     */
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
                return new Date(this.initialDate.getTime() - Math.random() * 100 * algorithmicConstants.dayToMS);//random day in the last 100 days
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
    refreshContacts() {
        this.contacts.sort((a, b) => a.date.getTime() - b.date.getTime());
        this.lastDate = this.contacts[this.contacts.length - 1].date;
        if (this.initialDate > this.contacts[0]);
        this.initialDate = this.contacts[0].date;
    }
    simulateOnce() {
        this.refreshContacts();
        const lastDateToSimulate = this.contacts[this.contacts.length - 1].date;
        /**
         * @type {Map<Person,Date>}
         */
        const result = new Map();
        /**@type {(import("./Person.js").UntrackedContact|Contact)[]} */
        const events = new Array(...this.contacts);
        /**@type {(contact:import("./Person.js").UntrackedContact)=>void} */
        const addUntrackedContact = (constact) => {
            const date = constact.date;
            for (let i in events) {
                if (events[i].date > date) {
                    events.splice(i, 0, constact);
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
            if (contact.person) {
                //contact is untracked. This is only triggered if the other person is infected
                if (!result.get(contact.person) && Math.random() < contact.intensity) {
                    result.set(contact.person, contact.date);
                }
            }
            //contact is tracked
            const aDate = result.get(contact.a);
            const bDate = result.get(contact.b);
            // if both or none is infected nothing happens
            if (aDate && bDate || !aDate && !bDate)
                continue;
            if (aDate) {
                const probabilityOfInfection = contact.intensity * Virus.getProbabilityOfInfectiousness(aDate, contact.date);
                if (Math.random() < probabilityOfInfection) {
                    result.set(contact.b, contact.date);
                }
            }
            if (bDate) {
                const probabilityOfInfection = contact.intensity * Virus.getProbabilityOfInfectiousness(bDate, contact.date);
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
    /**
     * 
     * @param {number} runs 
     */
    simulate(runs) {
        /**@type {{result:Map<Person,Date>, probability:number}[]} */
        const results = [];
        let probabilitySum = 0;
        for (let i = 0; i < runs; i++) {
            const result = this.simulateOnce();
            results.push(result);
            probabilitySum += result.probability;
        }
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
            result.probability /= probabilitySum;

            for (let person of this.persons) {
                if (result.result.get(person))
                    totalInfectionProbability.set(person, totalInfectionProbability.get(person) + result.probability);
                infectionDates.get(person).push({ date: result.result.get(person), p: result.probability });
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
    /**returns the persons as array to be able to use Array.map etc */
    get personArray() {
        return new Array(...this.persons);
    }
}