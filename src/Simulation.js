import { Person } from "./Person.js";
import { Contact } from "./Contact.js";
import { Virus } from "./Virus.js";
import { Observation } from "./Test.js";

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
                let toReturn = new Date(this.initialDate);
                toReturn.setDate(toReturn.getDate() - Math.random() * 100);//random day in the last 100 days
                return toReturn;
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
    }
    simulateOnce() {
        /**
         * @type {Map<Person,Date>}
         */
        const result = new Map();
        for (let person of this.persons) {
            const initialDate = this.personToInitialInfectionDate.get(person)();
            result.set(person, initialDate);
        }
        for (let contact of this.contacts) {
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
    simulate(runs) {
        /**@type {{result:Map<Person,Date>, probability:number}[]} */
        const results = [];
        let probabilitySum = 0;
        for (let i = 0; i < runs; i++) {
            const result = this.simulateOnce();
            results.push(result);
            probabilitySum += result.probability;
        }
        const totalInfectionProbability = new Map();
        for (let person of this.persons) {
            totalInfectionProbability.set(person, 0);
        }
        for (let result of results) {
            result.probability /= probabilitySum;

            for (let person of this.persons) {
                if (result.result.get(person))
                    totalInfectionProbability.set(person, totalInfectionProbability.get(person)+result.probability);
            }
        }
        return {
            totalInfectionProbability:totalInfectionProbability
        }
    }
}