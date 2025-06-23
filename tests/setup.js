// Jest setup for DOM testing
global.HTMLCanvasElement.prototype.getContext = jest.fn();
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn(),
  createGain: jest.fn(),
  destination: {}
}));

// Mock Web Speech API
global.speechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn(() => [])
};

global.SpeechSynthesisUtterance = jest.fn();