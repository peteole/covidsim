import { algorithmicConstants } from "./logic/constants.js";

/**
 * @typedef {(date:Date)=>{contactDensity:number,contactIntensity:number}} untrackedActivity
 */
/**
 * @typedef {Object} UntrackedContact
 * @property {Date} date -date at which the contact takes place
 * @property {Person} person -Person who has an untracked contact
 * @property {number} intensity -probability of transmission if one of the persons is infected and the other one not
 * @property {boolean} acuteInfected -whether other person is infected acutely
 * @property {number} everInfected -whether the other person was infected at any point in time
 * @typedef {(date:Date,person:Person)=>UntrackedContact} untrackedContactGenerator -generates next untracked contact starting at a given date
 */
/**@type {untrackedContactGenerator} */
const defaultContactGenerator = (date, person) => ({
    date: new Date(date.getTime() + 2 * person.untrackedFrequency * Math.random() * algorithmicConstants.dayToMS),
    acuteInfected: 0.001>Math.random(),
    everInfected: 0.01>Math.random(),
    intensity: 2 * Math.random() * person.untrackedIntensity,
    person: person
});
/**
 * Class representing persons in the real world.
 */
export class Person {
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