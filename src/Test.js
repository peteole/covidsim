import {Virus} from "./Virus.js";
import {Person} from "./Person.js";

export class Observation{
    /**
     * 
     * @param {Person} person 
     */
    constructor(person){
        this.person=person;
    }
    /**
     * 
     * @param {Date?} dateOfInfection - date at which an infection occurs or null when it does not occur
     * @returns {number} probability that this observation occurs given an invection
     */
    getProbability(dateOfInfection){
        return -1;
    }
}
/**
 * @typedef {Object} TestOptions
 * @property {number} sensitivity
 * @property {number} specificity
 * @property {number} timeT
 */

/**
 * @class
 */
export class Test extends Observation{
    /**
     * @param {Person} person
     * @param {Date} date - date of the test
     * @param {boolean} positive - true if the result is positive
     */
    constructor(person,date,positive,sensitivity=0.95,specificity=0.9, startObservability=2,endObservability=14){
        super(person);
        this.date=date;
        if(this.date){
            this.relevantTimeStart=new Date(date);
            this.relevantTimeStart.setDate(date.getDate()-endObservability);
            this.relevantTimeEnd=new Date(date);
            this.relevantTimeEnd.setDate(date.getDate()-startObservability);
        }
        this.positive=positive;
        this.sensitivity=sensitivity;
        this.specificity=specificity;
    }
    /**
     * 
     * @param {Date?} dateOfInfection - date at which an infection occurs or null when it does not occur
     * @returns {number} probability that this observation occurs given an invection
     */
    getProbability(dateOfInfection){
        if(dateOfInfection&&dateOfInfection>this.relevantTimeStart&&dateOfInfection<this.relevantTimeEnd){
            //infected
            return this.positive?this.sensitivity:1-this.specificity;
        }
        //not infected
        return this.positive?(1-this.specificity):this.sensitivity;
    }
}

export class SymptomLog extends Observation{
    constructor(){
        
    }
}