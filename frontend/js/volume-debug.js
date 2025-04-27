/**
 * Volume Knob Debug Tool
 * This script can be run from the browser console to diagnose volume knob issues
 */
(function() {
  console.clear();
  console.log('=== VOLUME KNOB DEBUG TOOL ===');
  
  // Check if volume knob and slider elements exist
  const volumeKnob = document.getElementById('volume-knob');
  const volumeSlider = document.getElementById('volume-slider');
  
  console.log('Volume Knob Element:', volumeKnob);
  console.log('Volume Slider Element:', volumeSlider);
  
  if (!volumeKnob) {
    console.error('ERROR: Volume knob element not found');
    return;
  }
  
  if (!volumeSlider) {
    console.error('ERROR: Volume slider element not found');
    return;
  }
  
  // Check current CSS properties
  const knobStyles = window.getComputedStyle(volumeKnob);
  console.log('Volume Knob CSS:', {
    position: knobStyles.position,
    zIndex: knobStyles.zIndex,
    width: knobStyles.width,
    height: knobStyles.height,
    transform: knobStyles.transform,
    pointerEvents: knobStyles.pointerEvents
  });
  
  const sliderStyles = window.getComputedStyle(volumeSlider);
  console.log('Volume Slider CSS:', {
    position: sliderStyles.position,
    zIndex: sliderStyles.zIndex,
    width: sliderStyles.width,
    height: sliderStyles.height,
    pointerEvents: sliderStyles.pointerEvents
  });
  
  // Test if volumeKnob responds to events
  console.log('Testing if volume knob responds to events...');
  
  // Check for existing event listeners
  const oldMousedown = volumeKnob.onmousedown;
  if (oldMousedown) {
    console.log('Found existing mousedown event on volume knob');
  }
  
  // Add test event to check for event propagation
  console.log('Adding test click event to volume knob...');
  volumeKnob.addEventListener('click', function(e) {
    console.log('Volume knob clicked at:', { x: e.clientX, y: e.clientY });
  });
  
  // Check z-index issues
  const elements = document.elementsFromPoint(
    volumeKnob.getBoundingClientRect().left + volumeKnob.offsetWidth / 2,
    volumeKnob.getBoundingClientRect().top + volumeKnob.offsetHeight / 2
  );
  
  console.log('Elements at the center of the knob (top to bottom):', elements);
  
  // Check current rotation and volume
  console.log('Current transform:', knobStyles.transform);
  console.log('Current slider value:', volumeSlider.value);
  
  // Manual fix for volume knob if needed
  console.log('\nTo manually test the volume knob, run:');
  console.log('document.getElementById("volume-knob").style.pointerEvents = "auto";');
  console.log('document.getElementById("volume-slider").style.zIndex = "20";');
  
  console.log('\n=== DEBUG COMPLETE ===');
})();
