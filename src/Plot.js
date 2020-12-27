import { Person } from "./Person";
import { Contact } from "./Contact";
import { algorithmicConstants } from "./constants";
import { Virus } from "./Virus";

/**
 * @typedef {Object} InfectionProbability - Datapoint for being infected at a given time
 * @property {Date} date - Date of the datapoint
 * @property {number} value - Probability of being infected
 */

const genericInfectionRate = (date = new Date()) => 0.01;

export class PersonLog {
    /**
     * 
     * @param {InfectionProbability} initialProbability 
     * @param {(date:Date)=>{contactDensity:number,contactIntensity:number}} untracked 
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
        const lastDatapoint = this.datapoints[this.datapoints.length - 1];
        let probability = lastDatapoint.value;
        //compute offset due to untracked contacts
        for (let day = lastDatapoint.date; day.getTime() < date.getTime(); day.setTime(day.getTime() + algorithmicConstants.deltaT * 1000 * 60 * 60)) {
            const dayInfo = this.untracked(date);
            probability = 1 - (1 - probability) * Math.pow(1 - genericInfectionRate(date) * dayInfo.contactIntensity, dayInfo.contactDensity * algorithmicConstants.deltaT);
        }
        return probability;
    }
    /**
     * 
     * @param {number} otherActiveInfectionProbability - probability of the contact person being actively infected at the time of contact
     * @param {*} date 
     */
    addContact(otherActiveInfectionProbability, date) {

    }
}

/**
 * Plot of an infection. Provides the functionality to compute infection probabilities for all persons involved.
 */
class Plot {
    constructor() {
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
    }

    /**
     * Infection probability log in the from of a map from all persons to their logs
     */
    get log() {
        /**@type {Map<Person,PersonLog>} */
        let personToLog = new Map();
        for (let person of this.persons) {
            personToLog.set(person, new PersonLog(0, person.externalActivity));
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