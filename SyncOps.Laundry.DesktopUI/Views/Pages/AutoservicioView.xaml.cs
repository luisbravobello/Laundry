using System.Windows;
using System.Windows.Controls;
using SyncOps.Laundry.DesktopUI.ViewModels;

namespace SyncOps.Laundry.DesktopUI.Views.Pages;

public partial class AutoservicioView : UserControl
{
    public AutoservicioView()
    {
        InitializeComponent();
    }

    private async void UserControl_Loaded(object sender, RoutedEventArgs e)
    {
        if (DataContext is AutoservicioViewModel vm)
        {
            await vm.CargarMaquinasAsync();
        }
    }
}
