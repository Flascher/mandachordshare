import { Component } from 'react';
import { Line, Text } from 'react-konva';
import MandachordNote from './mandachord-note';

type StepProps = {
  pos: number,
  scale: number
};

type StepState = {
  notesState: Array<boolean>
};

export default class MandachordStep extends Component<StepProps, StepState> {

  notesPerStep = 13;

  constructor(props) {
    super(props);

    this.state = {
      notesState: Array(this.notesPerStep).fill(false)
    };

    this.modifyStepNotes = this.modifyStepNotes.bind(this);
    this.drawStep = this.drawStep.bind(this);
  }

  modifyStepNotes(pos) {
    this.setState((prevState) => {
      prevState.notesState.splice(pos, 1, !prevState.notesState[pos]);
    });

    console.log(this.state.notesState);

    // serialize active step notes here

    console.log(`Note ${pos} in step ${this.props.pos} was made ${this.state.notesState[pos] ? 'active' : 'inactive'}`);
    this.forceUpdate();
  }

  drawStep() {
    const pos = this.props.pos;
    const scale = this.props.scale;

    const posArr = [...Array(this.notesPerStep).keys()]
    const notes = posArr.map(i =>
      <MandachordNote
        scale={scale}
        key={(pos * i) + i}
        pos={i}
        isActive={this.state.notesState[i]}
        onClick={this.modifyStepNotes}
      />
    )

    const linePoints = [1.25, 122.5, 2.5, (475 / scale)];
    const lineColor = '#E4F1FE';
    const lineWidth = 0.5;
    const isLoopPoint = pos / 16 === 0;
    const dash = isLoopPoint ? [3, 1] : [];
    const barLine = (
      <>
        <Line stroke={lineColor} strokeWidth={lineWidth} dash={dash} points={linePoints} width={lineWidth} />
        <Text text={`${(pos / 16) + 1}`} y={495 / scale} x={6} rotation={180} fill={lineColor} />
      </>
    );

    return (
      <>
        { notes }
        { pos % 16 === 0 ? barLine : null }
      </>
    );
  }

  render() {
    return this.drawStep();
  }

}