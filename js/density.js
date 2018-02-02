let intervalid = -1 // TODO: wat
let canvas = document.getElementById('canvas')
let ctx = $('#canvas')[0].getContext('2d')
let id = ctx.getImageData(0, 0, 1, 1)
let cw = canvas.width
let ch = canvas.height

// stats
let hasHotspot
let hasntHotspot
let avgHotspots
let avgClients

const RED_CHAN = 0
const GREEN_CHAN = 1
const BLUE_CHAN = 2
const ALPHA_CHAN = 3

const WIFI_LINK = 0
const BT_LINK = 1
const WIFI_DIRECT_LINK = 2
const CELL_LINK = 10

const BT_RANGE = 10

const WIFI_ENERGY = 10
const BT_ENERGY = 1
const WIFI_DIRECT_ENERGY = 10
const CELL_ENERGY = 100

const WIFI_HOTSPOT = "WIFI_HOTSPOT"
const WIFI_CLIENT = "WIFI_CLIENT"

const WIFI_DIRECT_HOTSPOT = "WIFI_DIRECT_HOTSPOT"
const WIFI_DIRECT_CLIENT = "WIFI_DIRECT_CLIENT"

const INTERNET_CONNECTED = "CELL_INTERNET"
const NOT_INTERNET_CONNECTED = "CELL_NO_INTERNET"

const WIFI_RADIO = "WIFI_RADIO"
const BT_RADIO = "BT_RADIO"
const WIFI_DIRECT_RADIO = "WIFI_DIRECT_RADIO"
const CELL_RADIO = "INTERNET_RADIO"

const CLAMP_BOUNCE = "CLAMP_BOUNCE"

const INFINITE_RANGE = -1

/**
* Store connection info of a link between two devices.
* There is no distinction between the two devices.
*/
class Link {
  constructor (left, right, type, delay, energy, cost) {
    this.left = left
    this.right = right
    this.type = type
    this.delay = delay
    this.energy = energy
    this.cost = cost
  }
}

class EnergyLink extends Link {
  constructor (left, right, type, energy) {
    super(left, right, type, 0, energy, 0)
  }
}

class Radio {
  constructor (defaultState, range) {
    this._enabled = defaultState
    this._range = range
  }

  enable () {
    this._enabled = false
  }

  disable () {
    this._enabled = true
  }

  get enabled () {
    return this._enabled
  }

  get range () {
    return this._range
  }
}

class Device {
  constructor (x, y, clamp) {
    this.radios = {}
    this.modes = {}
    this.moveTo(x, y)
    this._dx = 0
    this._dy = 0
    this.clamp = clamp
  }

  moveTo (x, y) {
    this._x = x
    this._y = y
  }

  moveAtSpeed () {
    moveRel(this._dx, this._dy)
  }

  addRadio (name, range) {
    this.radios[name] = new Radio(true, range)
  }

  radioMode (name, mode) {
    this.modes[name] = mode
  }

  is (name, mode) {
    if (this.modes[name] === mode) {
      return true
    }
    return false
  }

  range (name) {
    return this.radios[name].range
  }

  enableRadio (name) {
    this.radios[name].enable()
  }
  disableRadio (name) {
    this.radios[name].disable()
  }
  enabled (name) {
    return this.radios[name].enabled
  }

  get x () {
    return this._x
  }
  set x (pos) {
    this._x = pos
    switch (this.clamp) {
      case CLAMP_BOUNCE:
        if (this._x < 0) {
          this._x = 0
          this._dx *= -1
        }
        if (this._x > cw) {
          this._x = cw
          this._dx *= -1
        }
        break
    }
  }

  get y () {
    return this._y
  }
  set y (pos) {
    this._y = pos
    switch(this.clamp) {
      case CLAMP_BOUNCE:
        if (this._y < 0) {
          this._y = 0
          this._dy *= -1
        }
        if (this._y > ch) {
          this._y = ch
          this._dy *= -1
        }
        break
    }
  }

  get dx () {
    return this._dx
  }
  set dx (val) {
    this._dx = val
  }

  get dy () {
    return this._dy
  }
  set dy (val) {
    this._dy = val
  }
}

/**
* The simulator engine.
*/
class Simulator {
  generate (width, height, count, hotspotFraction, hotspotRange, dHotspotFraction, internetFraction) {
    console.log('generating')
    console.log(internetFraction)

    if (intervalid !== -1) {
      clearInterval(intervalid)
    }

    this.width = width
    this.height = height
    this.count = count
    this.wifiHotspotFraction = hotspotFraction
    this.wifiHotspotRange = hotspotRange
    this.wifiDirectHotspotFraction = dHotspotFraction
    this.internetFraction = internetFraction

    this.links = []
    this.devices = []

    for (let counter = 0; counter < this.count; counter++) {
      let x = Math.floor(Math.random() * cw) // TODO: globals
      let y = Math.floor(Math.random() * ch)

      let device = new Device(x, y, CLAMP_BOUNCE)

      if (Math.floor(Math.random() * 100) < hotspotFraction) {
        let range = Math.floor(Math.random() * hotspotRange) + (2 / 3 * hotspotRange)
        device.addRadio(WIFI_RADIO, range)
        device.radioMode(WIFI_RADIO, WIFI_HOTSPOT)
      } else {
        device.addRadio(WIFI_RADIO, INFINITE_RANGE)
        device.radioMode(WIFI_RADIO, WIFI_CLIENT)
      }

      if (Math.floor(Math.random() * 100) < dHotspotFraction) {
        let range = Math.floor(Math.random() * hotspotRange) + (2/3 * hotspotRange)
        device.addRadio(WIFI_DIRECT_RADIO, range)
        device.radioMode(WIFI_DIRECT_RADIO, WIFI_DIRECT_HOTSPOT)
      } else {
        device.addRadio(WIFI_DIRECT_RADIO, INFINITE_RANGE)
        device.radioMode(WIFI_DIRECT_RADIO, WIFI_DIRECT_CLIENT)
      }

      if (Math.floor(Math.random() * 100) < internetFraction) {
        device.addRadio(CELL_RADIO, INFINITE_RANGE)
        device.radioMode(CELL_RADIO, INTERNET_CONNECTED)
      } else {
        device.addRadio(CELL_RADIO, INFINITE_RANGE)
        device.radioMode(CELL_RADIO, NOT_INTERNET_CONNECTED)
      }

      this.devices.push(device)
    }
  }

  run (continuous) {
    if (continuous === false) {
      this.frame()
    } else {
      intervalid = setInterval(this.frame.bind(this), 100)
    }
  }

  pause () {
    clearInterval(intervalid)
  }

  frame () {
    this.clear()
    this.update()
    this.draw()
  }

  clear () {
    ctx.clearRect(0, 0, cw, ch)
  }

  update () {
    let counter = 0
    while (counter < this.devices.length) {
      let device = this.devices[counter]

      this.moveDevice(device)

      counter++
    }
    this.links = []
    this.updateLinks()
    this.updateBTLinks()
    this.updateWDLinks()
  }

  moveDevice (device) {
    let xStep = (Math.random() * 0.2) - 0.1
    let yStep = (Math.random() * 0.2) - 0.1

    device.dx += xStep
    device.dy += yStep
    device.x += device.dx
    device.y += device.dy
  }

  getHotspots (device) {
    let index = 0
    let hotspots = []

    let counter = 0
    while (counter < this.devices.length) {
      if (this.devices[counter].is(WIFI_RADIO, WIFI_HOTSPOT) === true) {
        let distance = Math.sqrt(Math.pow(this.devices[counter].x - device.x, 2) + Math.pow(this.devices[counter].y - device.y, 2))
        if (distance < this.devices[counter].range(WIFI_RADIO)) {
          hotspots[index] = this.devices[counter]
          index++
        }
      }
      counter++
    }
    return hotspots
  }

  getClients (device) {
    if (!device.is(WIFI_RADIO, WIFI_HOTSPOT)) {
      return []
    }
    let index = 0
    let clients = []

    let counter = 0
    while (counter < this.devices.length) {
      let distance = Math.sqrt(Math.pow(this.devices[counter].x - device.x, 2) + Math.pow(this.devices[counter].y - device.y, 2))
      if (distance < device.range(WIFI_RADIO)) {
        clients[index] = this.devices[counter]
        index++
      }
      counter++
    }
    return clients
  }

  updateLinks () {
    for (let counterLeft in this.devices) {
      let deviceLeft = this.devices[counterLeft]
      let hotspots = this.getHotspots(deviceLeft)
      for (let counterRight in hotspots) {
        let deviceRight = hotspots[counterRight]
        this.links.push(new EnergyLink(
          deviceLeft, deviceRight, WIFI_LINK, WIFI_ENERGY
        ))
      }
    }

    // Internet links
    for (let counterLeft = 0; counterLeft < this.devices.length; counterLeft++) {
      let deviceLeft = this.devices[counterLeft]
      for (let counterRight = counterLeft + 1; counterRight < this.devices.length; counterRight++) {
        let deviceRight = this.devices[counterRight]
        if (deviceLeft.is(CELL_RADIO, INTERNET_CONNECTED)
            && deviceRight.is(CELL_RADIO, INTERNET_CONNECTED)) {
          this.links.push(new EnergyLink(
            deviceLeft, deviceRight, CELL_LINK, CELL_ENERGY
          ))
        }
      }
    }
  }

  updateWDLinks () {
    for (let counterLeft = 0; counterLeft < this.devices.length; counterLeft++) {
      let deviceLeft = this.devices[counterLeft]
      for (let counterRight = counterLeft + 1; counterRight < this.devices.length; counterRight++) {
        let deviceRight = this.devices[counterRight]
        let distance = Math.sqrt(Math.pow(deviceLeft.x - deviceRight.x, 2) + Math.pow(deviceLeft.y - deviceRight.y, 2))
        
        let rangeLimit = 0
        let canHazHotspot = false

        if (deviceLeft.is(WIFI_DIRECT_HOTSPOT)) {
          rangeLimit = deviceLeft.range(WIFI_DIRECT_RADIO)
          canHazHotspot = true
        } else if (deviceRight.is(WIFI_DIRECT_HOTSPOT)) {
          rangeLimit = deviceRight.range(WIFI_DIRECT_RADIO)
          canHazHotspot = true
        }

        if (canHazHotspot) {
          if (distance < rangeLimit) {
            this.links.push(new EnergyLink(
              deviceLeft, deviceRight, WIFI_DIRECT_LINK, WIFI_DIRECT_ENERGY
            ))
          }
        }

      }
    }
  }

  updateBTLinks () {
    for (let counterLeft = 0; counterLeft < this.devices.length; counterLeft++) {
      let deviceLeft = this.devices[counterLeft]
      for (let counterRight = counterLeft + 1; counterRight < this.devices.length; counterRight++) {
        let deviceRight = this.devices[counterRight]
        let distance = Math.sqrt(Math.pow(deviceLeft.x - deviceRight.x, 2) + Math.pow(deviceLeft.y - deviceRight.y, 2))
        if (distance < BT_RANGE) {
          this.links.push(new EnergyLink(
            deviceLeft, deviceRight, BT_LINK, BT_ENERGY
          ))
        }
      }
    }
  }

  draw () {
    let counter = 0
    while (counter < this.devices.length) {
      this.drawDevice(this.devices[counter])
      counter++
    }
    this.drawLinks()
    this.computeStats()
  }

  drawDevice (device) {
    id.data[RED_CHAN] = 0
    id.data[GREEN_CHAN] = 0
    id.data[BLUE_CHAN] = 0
    id.data[ALPHA_CHAN] = 255

    ctx.putImageData(id, device.x, device.y)
    if (device.is(WIFI_RADIO, WIFI_HOTSPOT) === true) {
      ctx.fillStyle = 'rgba(255, 10, 10, .2)'
      ctx.beginPath()
      ctx.arc(device.x, device.y, device.range(WIFI_RADIO), 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.fill()
    }
    if (device.is(WIFI_DIRECT_RADIO, WIFI_DIRECT_HOTSPOT)) {
      ctx.fillStyle = 'rgba(155, 155, 10, .2)'
      ctx.beginPath()
      ctx.arc(device.x, device.y, device.range(WIFI_DIRECT_RADIO), 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(10, 10, 255, .2)'
    ctx.beginPath()
    ctx.arc(device.x, device.y, BT_RANGE, 0, Math.PI * 2, true)
    ctx.closePath()
    ctx.fill()

    if (device.is(CELL_RADIO, INTERNET_CONNECTED)) {
      ctx.fillStyle = 'rgba(0,0,0,.2)'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.arc(device.x, device.y, 5, 0, 2 * Math.PI, false)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  }

  drawLinks () {
    for (let counter in this.links) {
      let link = this.links[counter]
      if (link.type === WIFI_LINK) {
        ctx.strokeStyle = 'rgba(100, 10, 10, 1)'
        ctx.beginPath()
        ctx.moveTo(link.left.x, link.left.y)
        ctx.lineTo(link.right.x, link.right.y)
        ctx.stroke()
      } else if (link.type === BT_LINK) {
        ctx.strokeStyle = 'rgba(10, 10, 100, 1)'
        ctx.beginPath()
        ctx.moveTo(link.left.x, link.left.y)
        ctx.lineTo(link.right.x, link.right.y)
        ctx.stroke()
      } else if (link.type === WIFI_DIRECT_LINK) {
        ctx.strokeStyle = 'rgba(80, 80, 10, 1)'
        ctx.beginPath()
        ctx.moveTo(link.left.x, link.left.y)
        ctx.lineTo(link.right.x, link.right.y)
        ctx.stroke()
      }
    }
  }

  computeStats () {
    hasHotspot = 0
    hasntHotspot = 0
    avgHotspots = 0
    avgClients = 0
    let counter = 0
    let totalHotspots = 0
    let device = this.devices[0]
    while (counter < this.devices.length) {
      device = this.devices[counter]
      let hotspots = this.getHotspots(device)
      if (hotspots.length === 0) {
        hasntHotspot++
      } else {
        hasHotspot++
      }
      avgHotspots += hotspots.length
      counter++

      if (device.is(WIFI_RADIO, WIFI_HOTSPOT)) {
        totalHotspots++
        let clients = this.getClients(device)
        avgClients += clients.length
      }
    }

    let totalEnergy = 0

    for (let counter in this.links) {
      let link = this.links[counter]
      totalEnergy += link.energy
    }

    $('#stat-density').text(this.count)
    $('#stat-wifi-hotspot-percent').text(this.wifiHotspotFraction)
    $('#stat-wifi-hotspot-range').text(this.wifiHotspotRange)
    $('#stat-wifi-hotspot-coverage').text(((hasHotspot / this.count) * 100).toFixed(2))
    $('#stat-wifi-average-hotspots').text((avgHotspots / hasHotspot).toFixed(2))
    $('#stat-wifi-average-clients').text((avgClients / totalHotspots).toFixed(2))
    $('#stat-total-energy').text(totalEnergy)
  }
}

let sim = new Simulator()

// Characteristicis of Canada
function canada () {
  $('#density').val('4')
  if (intervalid !== -1) { clearInterval(intervalid) }
}

// Characteristicis of Guatamala City
function guatcity () {
  $('#density').val('1000')
  if (intervalid !== -1) { clearInterval(intervalid) }
}

// Characteristicis of Toronto
function tor () {
  $('#density').val('2650')
  if (intervalid !== -1) { clearInterval(intervalid) }
}

// Characteristic=is of Vancouver
function van () {
  $('#density').val('5249')
  if (intervalid !== -1) { clearInterval(intervalid) }
}



// ref: https://stackoverflow.com/questions/750032/reading-file-contents-on-the-client-side-in-javascript-in-various-browsers
function updateConf () {
  // Config file loading
  var confInput = document.getElementById('conf')
  var curFiles = confInput.files
  var conf = curFiles[0]
  var reader = new FileReader();
  reader.readAsText(conf, "UTF-8");
  reader.onload = function (evt) {
    document.getElementById("fileContents").innerHTML = evt.target.result
    nativeObject = YAML.parse(evt.target.result)
    const meshconf = nativeObject.meshdensitytool
    $('#density').val(meshconf.density)
    $('#ap').val(meshconf.wifiHotspotPercentage)
    $('#coverage').val(meshconf.wifiHotspotRange)
    $('#dap').val(meshconf.wifiDirectHotspotPercentage)
  }
  reader.onerror = function (evt) {
    document.getElementById("fileContents").innerHTML = "error reading file";
  }
}
