using System.Windows;
using SyncOps.Laundry.DesktopUI.ViewModels;

namespace SyncOps.Laundry.DesktopUI;

public partial class MainWindow : Window
{
    public MainWindow(MainViewModel viewModel)
    {
        InitializeComponent();
        DataContext = viewModel;
    }
}