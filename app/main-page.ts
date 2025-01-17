import { EventData, Page } from '@nativescript/core';
import { MainViewModel } from './main-view-model';

let viewModel: MainViewModel;

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  viewModel = new MainViewModel();
  page.bindingContext = viewModel;
}

export function onUnloaded() {
  if (viewModel) {
    viewModel.cleanup();
  }
}