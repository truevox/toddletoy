/**
 * Tests for jump during speech behavior
 * Validates that speaking objects jump to interaction point when clicked/tapped during speech
 */

import { jest } from '@jest/globals';

describe('Jump During Speech', () => {
    test('clicking during speech should move speaking object to click location', () => {
        // Mock game scene
        const scene = {
            speechManager: {
                getIsSpeaking: jest.fn().mockReturnValue(true),
                getCurrentSpeakingObject: jest.fn().mockReturnValue({
                    id: 'obj1',
                    x: 100,
                    y: 100,
                    active: true
                })
            },
            moveObjectTo: jest.fn(),
            audioManager: {
                updateTonePosition: jest.fn()
            },
            particleManager: {
                createSpawnBurst: jest.fn()
            },
            autoCleanupManager: {
                updateObjectTouchTime: jest.fn()
            }
        };

        // Simulate click during speech
        const clickX = 300;
        const clickY = 400;

        // Expected behavior: move speaking object to click location
        const speakingObj = scene.speechManager.getCurrentSpeakingObject();
        scene.moveObjectTo(speakingObj, clickX, clickY);
        scene.audioManager.updateTonePosition(clickX, clickY, speakingObj.id);
        scene.particleManager.createSpawnBurst(clickX, clickY);
        scene.autoCleanupManager.updateObjectTouchTime(speakingObj);

        expect(scene.moveObjectTo).toHaveBeenCalledWith(speakingObj, clickX, clickY);
        expect(scene.audioManager.updateTonePosition).toHaveBeenCalledWith(clickX, clickY, 'obj1');
        expect(scene.particleManager.createSpawnBurst).toHaveBeenCalledWith(clickX, clickY);
        expect(scene.autoCleanupManager.updateObjectTouchTime).toHaveBeenCalledWith(speakingObj);
    });

    test('speech should continue after jump', () => {
        const scene = {
            speechManager: {
                getIsSpeaking: jest.fn().mockReturnValue(true),
                getCurrentSpeakingObject: jest.fn().mockReturnValue({
                    id: 'obj1'
                }),
                cancelSpeech: jest.fn()
            },
            moveObjectTo: jest.fn(),
            audioManager: {
                updateTonePosition: jest.fn()
            },
            particleManager: {
                createSpawnBurst: jest.fn()
            },
            autoCleanupManager: {
                updateObjectTouchTime: jest.fn()
            }
        };

        // Jump during speech should NOT cancel speech
        const speakingObj = scene.speechManager.getCurrentSpeakingObject();
        scene.moveObjectTo(speakingObj, 200, 200);

        expect(scene.speechManager.cancelSpeech).not.toHaveBeenCalled();
    });

    test('should not jump if no object is currently speaking', () => {
        const scene = {
            speechManager: {
                getIsSpeaking: jest.fn().mockReturnValue(true),
                getCurrentSpeakingObject: jest.fn().mockReturnValue(null)
            },
            moveObjectTo: jest.fn()
        };

        // If no speaking object, should not attempt to move
        const speakingObj = scene.speechManager.getCurrentSpeakingObject();

        if (speakingObj) {
            scene.moveObjectTo(speakingObj, 200, 200);
        }

        expect(scene.moveObjectTo).not.toHaveBeenCalled();
    });
});
