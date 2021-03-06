// import packages
import { Component, createRef } from 'react';
import { ReactReduxContext, Provider, connect } from 'react-redux';
import styled from 'styled-components';
import { Stage, Layer, Group, Circle, Line, Image } from 'react-konva';
import ReactAnimationFrame from 'react-animation-frame';

// import utils
import supportsPassive from '../../util/supportsPassive';

// import selectors
import { selectActiveNotesByCurrentStep } from '../../state/selectors/mandachord';

// import actions
import {
  updatePlaybackTime,
  setIsClientLoaded
} from '../../state/actions/mandachord';

// import assets
import PanIconSvg from '../../assets/pan_icon.svg';

// import components
import MandachordStep from './mandachord-step';
import PlayPauseButton from './play-pause-button';
import InstrumentMenu from './instrument-menu';
import palette from '../../styles/palette';

// styles
const MandachordContainer = styled.div`
  display: flex;
  height: 50vh;
  width: 100%;
`;

const CanvasContainer = styled.div`
  height: 100%;
  width: 80%;
  position: relative;
`;

const StyledPanIconSvg = styled(PanIconSvg)`
  pointer-events: none;
  width: ${({ stageWidth }) => stageWidth / 15}px;
  height: auto;
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 5px;
  opacity: 0.4;
  z-index: 2;
`;
// end styles

class Mandachord extends Component {
  virtualW = 500;
  virtualH = 400;
  numSteps = 64;
  dash1 = this.generateRandomDash(1, 25, 15);
  dash2 = this.generateRandomDash(3, 50, 20);
  circleAnimStarted = false;
  canvasContainerEl = createRef();

  constructor(props) {
    super(props);

    this.state = {
      stageWidth: 0,
      stageHeight: 0,
      stageScale: 1,
      stageRot: 0,
      currentNoteRot: 0,
      isDragging: false
    };
    this.resizeMandachord = this.resizeMandachord.bind(this);
    this.startDragging = this.startDragging.bind(this);
  }

  componentDidMount() {
    this.props.setIsClientLoaded(true);
    this.resizeMandachord();

    window.addEventListener('resize', this.resizeMandachord);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resizeMandachord);
  }

  resizeMandachord() {
    let w = this.canvasContainerEl.current.clientWidth;
    let h = this.canvasContainerEl.current.clientHeight;

    let s = Math.min(w / this.virtualW, h / this.virtualH);

    this.setState({
      stageWidth: w,
      stageHeight: h,
      stageScale: s
    });
  }

  onAnimationFrame(timestamp, lastTimestamp) {
    if (this.props.isPaused) {
      return;
    }

    const delta = timestamp - lastTimestamp;

    const rot = -1 * (delta / 100) * 4.5;

    this.setState(prevState => ({
      stageRot: prevState.stageRot + rot,
      currentNoteRot: prevState.currentNoteRot + rot
    }));

    this.props.updatePlaybackTime(delta);
  }

  startDragging({ evt }) {
    if (this.state.isDragging || !this.props.isPaused) return;

    let lastX = evt.screenX;

    this.setState({ isDragging: true });

    const moveListener = e => {
      const speed = 0.1;

      let rot = speed * (e.screenX - lastX);
      // rotate the mandachord
      this.setState(prevState => ({
        stageRot: prevState.stageRot + rot
      }));

      lastX = e.screenX;
    };

    const mouseUpListener = () => {
      this.setState({ isDragging: false });

      // remove the listener after we've stopped dragging
      window.removeEventListener('mouseup', mouseUpListener);
      window.removeEventListener('touchend', mouseUpListener);
      window.removeEventListener('mousemove', moveListener);
      window.removeEventListener('touchmove', moveListener);
    };

    if (supportsPassive) {
      // listen across the whole window for mouseup so we can stop panning
      window.addEventListener('mouseup', mouseUpListener, { passive: true });
      window.addEventListener('touchend', mouseUpListener, { passive: true });
      // listen for mousemove while dragging so we can rotate
      window.addEventListener('mousemove', moveListener, { passive: true });
      window.addEventListener('touchmove', moveListener, { passive: true });
    } else {
      // same as above, but not passive if the browser doesn't support passive event listeners
      window.addEventListener('mouseup', mouseUpListener);
      window.addEventListener('touchend', mouseUpListener);
      window.addEventListener('mousemove', moveListener);
      window.addEventListener('touchmove', moveListener);
    }
  }

  renderCurrentNoteMark() {
    const lineColor = '#fff';
    const lineWidth = 1;
    const linePoints = [1.25, 122.5, 2.5, 435];

    return (
      <Group rotation={-1 * this.state.currentNoteRot}>
        <Line stroke={lineColor} strokeWidth={lineWidth} points={linePoints} />
        <Circle x={2.5} y={432.5} radius={7.5} fill={lineColor} />
      </Group>
    );
  }

  renderSteps() {
    const posArr = [...Array(this.numSteps).keys()];
    const steps = posArr.map(i => (
      <Group key={i} rotation={i * (360 / this.numSteps)}>
        <MandachordStep pos={i} />
      </Group>
    ));

    return steps;
  }

  generateRandomDash(min, max, length) {
    return Array.from({ length: length }, () =>
      Math.floor(min + Math.random() * (max - min))
    );
  }

  renderPanCircle() {
    const radius = 110;
    const fillColor = '#34495E';

    return (
      <Group onMouseDown={this.startDragging}>
        <Circle radius={radius} fill={fillColor} />
        <Circle
          radius={radius - 5}
          stroke={palette.lotusTheme.accent}
          dash={this.dash1}
        />
        <Circle
          radius={radius - 30}
          stroke={palette.lotusTheme.accent}
          dash={this.dash2}
        />
      </Group>
    );
  }

  renderMandachord() {
    const width = this.state.stageWidth;
    const height = this.state.stageHeight;
    const scale = this.state.stageScale;
    const rotation = this.state.stageRot;

    const steps = this.renderSteps();
    const panCircle = this.renderPanCircle();

    // ReactReduxContext and Provider from react-redux are dumb hacks
    // required to support react-reudx 6.0+ inside of react-konva
    // keep an eye on this issue (https://github.com/konvajs/react-konva/issues/311)
    // for when they (hopefully) update their stupid useful canvas library
    return (
      <ReactReduxContext.Consumer>
        {({ store }) => (
          <Stage width={width} height={height} scaleX={scale} scaleY={scale}>
            <Provider store={store}>
              <Layer x={10} y={30}>
                <PlayPauseButton />
              </Layer>
              <Layer
                x={width / 2 / scale}
                y={(height + 50) / scale}
                rotation={rotation + 135}
              >
                {this.renderCurrentNoteMark()}
                {steps}
              </Layer>
              <Layer
                x={width / 2 / scale}
                y={(height + 50) / scale}
                rotation={rotation}
              >
                {panCircle}
              </Layer>
            </Provider>
          </Stage>
        )}
      </ReactReduxContext.Consumer>
    );
  }

  render() {
    return (
      <MandachordContainer>
        <CanvasContainer ref={this.canvasContainerEl}>
          <StyledPanIconSvg stageWidth={this.state.stageWidth} />
          {this.renderMandachord()}
        </CanvasContainer>
        <InstrumentMenu />
      </MandachordContainer>
    );
  }
}

const mapStateToProps = state => {
  return {
    isPaused: state.mandachord.isPaused,
    playbackTime: state.mandachord.playbackTime,
    currentActiveNotes: selectActiveNotesByCurrentStep(state)
  };
};

const mapDispatchToProps = {
  updatePlaybackTime,
  setIsClientLoaded
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReactAnimationFrame(Mandachord, 1));
