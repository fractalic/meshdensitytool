import React, { Component } from 'react';

import ReactDOM from 'react-dom'

class SimulationParameter extends React.Component {
  constructor (props) {
    super(props)
    this.state = {value: this.props.default }

    this.handleChange = this.handleChange.bind(this)
  }

  handleChange(event) {
    this.setState({value: event.target.value})
  }
  render() {
    return (
      <div className="SimulationParameter param-grid-container">
        <label>{this.props.label}</label>
        <input id={this.props.id} type="text" value={this.state.value} onChange={this.handleChange} />
      </div>
    )
  }
}

class AppUI extends React.Component {
  render () {
    return (
      <div>
      <SimulationParameter label="Population density / square km:" id="density" default="100" />
      <SimulationParameter label="Wifi hotspot percentage:" id="ap" default="20" />
      <SimulationParameter label="Wifi hotspot range:" id="coverage" default="20" />
      <SimulationParameter label="Wifi-direct hotspot percentage:" id="dap" default="5" />
      <SimulationParameter label="Percentage of internet-sharers:" id="percent-internet" default="5" />
      <br />
      <SimulationParameter label="Number of runs" id="runs" default="10" />
      </div>
    )
  }
}

export default AppUI;