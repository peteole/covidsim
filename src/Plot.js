import { Person } from "./Person.js";
import { Contact } from "./Contact.js";
import { algorithmicConstants } from "./constants.js";
import { Virus } from "./Virus.js";

/**
 * @typedef {Object} InfectionProbability - Datapoint for being infected at a given time
 * @property {Date} date - Date of the datapoint
 * @property {number} value - Probability of being infected
 */

const genericInfectionRate = (date = new Date()) => 0.1;

export class PersonLog {
    /**
     * 
     * @param {InfectionProbability} initialProbability 
     * @param {import("./Person").untrackedActivity} untracked 
     */
    constructor(initialProbability, untracked) {
        this.datapoints = [initialProbability];
        this.untracked = untracked;
    }
    /**
     * get probability of being infected at given date according to the data in this log.
     * @param {Date} date 
     * @returns {number} probability of infection
     */
    getInfectionProbability(date) {
        let datapoint = this.datapoints[0];
        for (let i = 1; i < this.datapoints.length; i++) {
            if (this.datapoints[i].date.getTime() > date)
                break;
            datapoint = this.datapoints[i];
        }
        let probability = datapoint.value;
        //compute offset due to untracked contacts
        for (let day = new Date(datapoint.date); day.getTime() < date.getTime(); day.setTime(day.getTime() + algorithmicConstants.deltaT * 1000 * 60 * 60 * 24)) {
            const dayInfo = this.untracked(day);
            probability = 1 - (1 - probability) * Math.pow(1 - genericInfectionRate(date) * dayInfo.contactIntensity, dayInfo.contactDensity * algorithmicConstants.deltaT);
        }
        return probability;
    }
    /**
     * 
     * @param {number} otherActiveInfectionProbability - probability of the contact person being actively infected at the time of contact
     * @param {Date} date 
     */
    addContact(otherActiveInfectionProbability, date) {
        throw new Error("This method is not yet implemented");
    }
}

/**
 * Plot of an infection. Provides the functionality to compute infection probabilities for all persons involved.
 */
export class Plot {
    constructor(initialDate = new Date()) {
        this.initialDate = initialDate;
        /**@type {Set<Person>}*/
        this.persons = new Set();
        /** @type {Contact[]} */
        this.contacts = [];
    }
    /**@param {Person} toAdd */
    addPerson(toAdd) {
        this.persons.add(toAdd);
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
        this.persons.add(toAdd.a);
        this.persons.add(toAdd.b);
    }

    /**
     * Infection probability log in the from of a map from all persons to their logs
     */
    get log() {
        /**@type {Map<Person,PersonLog>} */
        let personToLog = new Map();
        for (let person of this.persons) {
            personToLog.set(person, new PersonLog({ date: this.initialDate, value: genericInfectionRate(this.initialDate) }, person.externalActivity));
        }
        for (let contact of this.contacts) {
            const logA = personToLog.get(contact.a);
            const logB = personToLog.get(contact.b);
            const probA = logA.getInfectionProbability(contact.date);
            const probB = logB.getInfectionProbability(contact.date);


            const acuteProbA = Virus.getAcuteInfectionProbability(logA, contact.date);
            const acuteProbB = Virus.getAcuteInfectionProbability(logB, contact.date);
            logA.datapoints.push({
                date: contact.date,
                value: 1 - (1 - probA) * (1 - acuteProbB * contact.intensity)
            });
            logB.datapoints.push({
                date: contact.date,
                value: 1 - (1 - probB) * (1 - acuteProbA * contact.intensity)
            });
        }
        return personToLog;
    }
}