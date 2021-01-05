import { Person } from "./Person";
import { algorithmicConstants } from "./constants.js";

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
 * Plot of an infection. Includes infection dates for all actors.
 */
export class Plot {
    /**
     * 
     * @param {Set<Person>} persons 
     */
    constructor(persons){
        /**@type {Map<Person,Date>} */
        this.persons=new Map();
        for(let person in persons){
            this.persons.set(person,none);
        }
    }
    setInfectionDate(person, date){
        this.persons.set(person,date);
    }
}