# covidsim
Low level covid-19 simulation to evaluate the risk of the contacts you have. Demo: https://peteole.github.io/covidsim/dist/home.html

## Purpose
Have you ever wondered how bad the effects of a certain contact are in the pandemic? Or what you actually know by doing a test?
This simulation is intended to answer just these questions. You enter the contacts you had or intend to have and you get a graph of infection probabilities of all persons involved based on a model. Perhaps the most interesting feature to look at is the change in infection probabilities when adding or removing contacts. Like this you get a measurement of how bad the certain contact was.

## How to interpret the output
The graphs show infection probabilities for all involved persons over time. The infection probability is the probability of EVER having been infected at that date. This means that probability of an acute infection is represented by the *difference* of infection probabilities between the date of interest and circa 10 days ago. (If you are infected now with 0.5 and were infected 0.2 10 days ago, the probability that you got an infection in the last 10 days is 0.3).
## The modeling
Due to the mathematical complexity of the problem a numerical algorithm is chosen. The simulation is based on *contacts* and 
*observations*.
### Contacts
A *contact* means two people meet and infect each other with a given probability "intensity" if exacly one of them is  acutely infected before and the other one has never been infected. You can added *tracked contacts* via the UI and enter the relevant data yourself. You can also specify *untracked contacts*. These are contacts you do not know the exact circumstance about, like people you see in a bus. You just define average intensities and a frequency of those contacts. The infection probability of the persons you had contact with is set to a generic estimate.

For each iteration of the simulation, all contacts are simulated. The result is an infection date for all participants (or no infection date if they are never infected). With many iterations, you get a distrobution of infection dates for each person which is visualized in the graph.

### Observations
The other central component are *observations*. These are things you *observe* about the people involved like a Covid-19-test-results or symptoms (in future releases). For each iteration result, the probability of an observation occuring given that result is computed. For example if the result says "I have been infected a week ago" and the observation is "I have a positive test result", the probability of that observation given the simulation result is the sensitivity of the test.

All iteration results are then weightened by their probability of being correct given the observations made.

Note that it is essential that all observations are independent of each other. Covid symptoms from two succeeding days are NOT independent since the probability of having symptoms on one day affects the probability of having symptoms the next day.
Tests results on the other hand should be independent from each other because they should only depend on whether the person is infected or not.

### Other assumptions
It is assumed that before the acual simulation starts, all participants have been infected with a probability of 0.01 and if they have been infected were infected at a rondom day from the last 100 days.

## Implementation
The simulation is implements in TypeScript and a LitElement UI. The graphing uses Dygraphs. Persons, Contacts Simulations and Observations are represented in classes. Each of these classes has a corresponding UI element. Untrackeded contacts are defined by a function mapping a date to the next untracked contact (this is probabilistic, for example you can map a day to a contact at a rondom date in the next 2 days).
Since the simulation is computationally intensive, it is offloaded to a WebWorker.
## Personal data protection
No personal data ever leave your device. The website is just statically hosted by GitHub, so there is not even the possibility of saving user data.
## Outlook
There are still lots of features to be implemented:
- Procession of covid 19 symptom observations
- Customizability of lots of parameters via the UI
- Verifying and fine-tuning the scientific assumptions made in the simulation
- Performance improvements
- Implement sharing of contacts with friends
- implement comparison mode between two possibilities (meeting a person or not etc)
- UI improvements

# Contributing
Contributers are welcome! Just contact me via peteole2707@gmail.com.