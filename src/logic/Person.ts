import { algorithmicConstants } from "./constants";

/**
 * @typedef {(date:Date)=>{contactDensity:number,contactIntensity:number}} untrackedActivity
 */

export interface UntrackedContact  {
    /**-date at which the contact takes place */
    date: Date;
    /**person having an untracked contact */
    person: Person;
    /**probability of transmission if one of the persons is infected and the other one not */
    intensity: number;
    /**whether other person is infected acutely */
    acuteInfected: boolean;
    /**whether the other person was infected at any point in time */
    everInfected: boolean;
}
/** generates next untracked contact starting at a given date */
export type untrackedContactGenerator=(date:Date,person:Person)=>UntrackedContact;

const defaultContactGenerator:untrackedContactGenerator = (date: Date, person: Person) => ({
    date: new Date(date.getTime() + 2 * person.untrackedFrequency * Math.random() * algorithmicConstants.dayToMS),
    acuteInfected: 0.001 > Math.random(),
    everInfected: 0.01 > Math.random(),
    intensity: 2 * Math.random() * person.untrackedIntensity,
    person: person
});
/**
 * Class representing persons in the real world.
 */
export class Person {
    name: string;
    untrackedFrequency: number;
    untrackedIntensity: number;
    externalActivity: any;
    /**
     * @param {string} name
     * @param {untrackedContactGenerator} externalActivity - generates next contact of person starting at given date
     */
    constructor(name: string, untrackedFrequency = 1, untrackedIntensity = 0.1, externalActivity = defaultContactGenerator) {
        this.externalActivity = externalActivity;
        this.name = name;
        this.untrackedFrequency = untrackedFrequency;
        this.untrackedIntensity = untrackedIntensity;
    }
}